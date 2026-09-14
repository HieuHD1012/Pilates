"""Hạ tầng test.

Chạy trên PostgreSQL thật (container `db_test`, cổng 5434), không phải SQLite:
phần lớn bất biến của hệ nằm ở exclusion constraint, partial unique index,
trigger và `FOR UPDATE` — SQLite không có cái nào trong số đó, nên test trên
SQLite sẽ xanh trên đúng những chỗ nguy hiểm nhất.

Schema test được dựng bằng **chính chuỗi migration**, không phải
`Base.metadata.create_all`. `create_all` chỉ dựng bảng và ràng buộc khai báo,
bỏ qua toàn bộ trigger nằm trong migration; chép tay các câu `CREATE TRIGGER`
sang đây thì test lại chạy trên một CSDL có thể khác PROD đúng ở chỗ quan
trọng nhất, mà không gì báo.
"""

from __future__ import annotations

import os
import shutil
import tempfile

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://pilates:pilates@localhost:5434/pilates_test"
)
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789")
os.environ.setdefault("ENVIRONMENT", "test")
# Ảnh test không được rơi vào cây mã nguồn: mỗi phiên test một thư mục tạm riêng.
_STORAGE_DIR = tempfile.mkdtemp(prefix="pilates-test-storage-")
# Gán thẳng, không `setdefault`: nếu máy dev/CI đã export STORAGE_DIR thì
# test sẽ ghi ảnh vào thư mục thật và bước dọn chỉ xoá thư mục tạm bỏ không.
os.environ["STORAGE_DIR"] = _STORAGE_DIR

import pytest  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from alembic import command  # noqa: E402
from app.core import security  # noqa: E402
from app.core.rate_limit import (  # noqa: E402
    lead_limiter,
    login_limiter,
    password_reset_limiter,
)
from app.db import SessionLocal, engine, get_db  # noqa: E402
from app.domain.rules import Role  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402

TEST_PASSWORD = "MatKhauTest#2026"


@pytest.fixture(scope="session", autouse=True)
def _schema() -> None:
    """Dựng lại schema một lần cho cả phiên test, qua đúng chuỗi migration."""
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    command.upgrade(Config("alembic.ini"), "head")
    yield
    shutil.rmtree(_STORAGE_DIR, ignore_errors=True)


#: Bảng được dọn giữa các test.
_TRUNCATE_SQL = text(
    "TRUNCATE TABLE "
    "credit_ledger, payment, booking, waitlist_entry, class_session, "
    "student_package, package_type, progress_photo, renewal_contact, "
    "lead, announcement, student, trainer, import_run, "
    "password_reset, refresh_token, user_account "
    "RESTART IDENTITY CASCADE"
)


@pytest.fixture(autouse=True)
def _clean_db() -> None:
    with engine.begin() as conn:
        # `credit_ledger` chặn cả TRUNCATE. Tắt trigger quanh bước dọn là đường
        # duy nhất hợp lệ — và cũng chính là cách một migration sửa dữ liệu
        # chạm bảng này phải làm ở PROD (ghi ở `docs/business-rules.md` §3).
        conn.execute(text("ALTER TABLE credit_ledger DISABLE TRIGGER USER"))
        conn.execute(_TRUNCATE_SQL)
        conn.execute(text("ALTER TABLE credit_ledger ENABLE TRIGGER USER"))

    # Bộ đếm rate limit nằm trong bộ nhớ tiến trình nên rò rỉ giữa các test.
    login_limiter.clear()
    password_reset_limiter.clear()
    lead_limiter.clear()


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        # Nhiều test cố ý để một transaction vỡ vì ràng buộc; rollback ở đây để
        # bước dọn dẹp không chết theo với PendingRollbackError.
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    """TestClient dùng chung một session với fixture `db` của cùng test."""
    session = SessionLocal()

    def override_get_db():
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    session.close()


@pytest.fixture
def concurrent_client() -> TestClient:
    """TestClient **không** ghi đè `get_db`.

    Fixture `client` cho mọi request dùng chung một session để test đọc lại
    được dữ liệu ngay; nhưng test đồng thời thì cần đúng điều ngược lại — mỗi
    request một session, một transaction, như lúc chạy thật. Dùng chung session
    ở đây sẽ đo một hệ thống không tồn tại.
    """
    with TestClient(app) as test_client:
        yield test_client


def make_user(
    db: Session,
    role: Role,
    email: str | None = None,
    password: str | None = TEST_PASSWORD,
    is_active: bool = True,
) -> User:
    user = User(
        email=email or f"{role.value.lower()}@example.com",
        full_name=f"Tài khoản {role.value}",
        role=role,
        is_active=is_active,
        password_hash=security.hash_password(password) if password else None,
    )
    db.add(user)
    # Commit chứ không flush: request qua TestClient chạy trên session khác nên
    # dữ liệu chưa commit sẽ vô hình với nó.
    db.commit()
    return user


def login(client: TestClient, email: str, password: str = TEST_PASSWORD) -> dict[str, str]:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
