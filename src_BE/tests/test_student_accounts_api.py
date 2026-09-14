"""Admin cấp/nối tài khoản học viên, có kiểm giao dịch và quyền."""

import re
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.rules import Role
from app.models.people import Student
from app.models.user import User
from tests.conftest import TEST_PASSWORD, auth_header, login, make_user
from tests.factories import make_student


def _payload(student_id: int | None, email: str = "new-student@example.com") -> dict:
    return {
        "email": email,
        "role": "STUDENT",
        "student_id": student_id,
        "password": TEST_PASSWORD,
    }


def test_admin_creates_linked_student_account(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])
    student = client.post(
        "/students", headers=headers, json={"full_name": "Lan", "phone": "0901000099"}
    ).json()
    response = client.post("/accounts", headers=headers, json=_payload(student["id"]))
    assert response.status_code == 201, response.text
    tokens = login(client, "new-student@example.com")
    me = client.get("/auth/me", headers=auth_header(tokens["access_token"]))
    assert me.json()["student_id"] == student["id"]
    profile = client.get(f"/students/{student['id']}", headers=headers).json()
    assert profile["user_id"] == response.json()["id"]
    assert (
        client.get("/my-schedule", headers=auth_header(tokens["access_token"])).status_code == 200
    )


def test_activation_email_sent_after_student_is_linked(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    student = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    payload = _payload(student.id)
    del payload["password"]
    observed = []

    def sent(email, raw_token):
        db.expire_all()
        observed.append(db.get(Student, student.id).user_id)
        assert email == payload["email"]
        assert raw_token

    with patch("app.api.accounts.send_password_reset", side_effect=sent):
        response = client.post("/accounts", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "PENDING_ACTIVATION"
    assert observed == [response.json()["id"]]


@pytest.mark.parametrize("role", [Role.STAFF, Role.TRAINER, Role.STUDENT, None])
def test_only_admin_can_grant_account(client: TestClient, db: Session, role) -> None:
    student = make_student(db)
    headers = {}
    if role:
        user = make_user(db, role)
        headers = auth_header(login(client, user.email)["access_token"])
    response = client.post("/accounts", headers=headers, json=_payload(student.id))
    assert response.status_code == (403 if role else 401)
    assert db.scalar(select(User.id).where(User.email == "new-student@example.com")) is None


@pytest.mark.parametrize(
    "case", ["missing", "unknown", "wrong_role", "already_linked", "email_taken"]
)
def test_invalid_grant_leaves_no_orphan_account(client: TestClient, db: Session, case: str) -> None:
    admin = make_user(db, Role.ADMIN)
    student = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    payload = _payload(student.id)
    expected = (422, "STUDENT_REQUIRED")
    if case == "missing":
        del payload["student_id"]
    elif case == "unknown":
        payload["student_id"] = 99999
        expected = (404, "NOT_FOUND")
    elif case == "wrong_role":
        payload["role"] = "TRAINER"
        expected = (422, "ACCOUNT_ROLE_MISMATCH")
    elif case == "already_linked":
        old = make_user(db, Role.STUDENT)
        student.user_id = old.id
        db.commit()
        expected = (409, "STUDENT_HAS_ACCOUNT")
    elif case == "email_taken":
        make_user(db, Role.STAFF, email=payload["email"])
        expected = (422, "EMAIL_TAKEN")
    count = db.scalar(select(func.count()).select_from(User))
    response = client.post("/accounts", headers=headers, json=payload)
    assert (response.status_code, response.json()["detail"]["code"]) == expected
    db.expire_all()
    assert db.scalar(select(func.count()).select_from(User)) == count
    assert db.get(Student, student.id).user_id == (old.id if case == "already_linked" else None)


def test_admin_repairs_existing_unlinked_account_without_reassigning(
    client: TestClient, db: Session
):
    admin = make_user(db, Role.ADMIN)
    user = make_user(db, Role.STUDENT)
    student = make_student(db)
    other = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    response = client.patch(
        f"/accounts/{user.id}", headers=headers, json={"student_id": student.id}
    )
    assert response.status_code == 200, response.text
    me = client.get("/auth/me", headers=auth_header(login(client, user.email)["access_token"]))
    assert me.json()["student_id"] == student.id
    for payload, code in [
        ({"student_id": other.id}, "ACCOUNT_ALREADY_LINKED"),
        ({"student_id": None}, "STUDENT_REQUIRED"),
        ({"role": "TRAINER"}, "ACCOUNT_ROLE_MISMATCH"),
        ({"role": None}, "ACCOUNT_ROLE_MISMATCH"),
    ]:
        response = client.patch(f"/accounts/{user.id}", headers=headers, json=payload)
        assert response.json()["detail"]["code"] == code
        assert response.status_code in (409, 422)


def test_parallel_grants_create_one_account(concurrent_client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    student = make_student(db)
    headers = auth_header(login(concurrent_client, admin.email)["access_token"])
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(
                concurrent_client.post,
                "/accounts",
                headers=headers,
                json=_payload(student.id, f"new{i}@example.com"),
            )
            for i in range(2)
        ]
        responses = [future.result(timeout=15) for future in futures]
    assert sorted(response.status_code for response in responses) == [201, 409]
    assert db.scalar(select(func.count()).select_from(User).where(User.role == Role.STUDENT)) == 1
    db.expire_all()
    assert db.get(Student, student.id).user_id is not None


def test_changing_role_to_student_requires_profile(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    user = make_user(db, Role.STAFF)
    student = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    response = client.patch(f"/accounts/{user.id}", headers=headers, json={"role": "STUDENT"})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "STUDENT_REQUIRED"
    response = client.patch(
        f"/accounts/{user.id}",
        headers=headers,
        json={"role": "STUDENT", "student_id": student.id},
    )
    assert response.status_code == 200, response.text
    me = client.get("/auth/me", headers=auth_header(login(client, user.email)["access_token"]))
    assert me.json()["student_id"] == student.id


# --- Chi tiết một tài khoản --------------------------------------------------


def test_admin_reads_one_account_without_the_password_hash(
    client: TestClient, db: Session
) -> None:
    """Màn chi tiết tài khoản trả đủ thứ admin cần, và **không** trả băm mật khẩu.

    Băm argon2 lọt ra response là thứ không thu hồi được: nó nằm lại trong log
    proxy, trong cache trình duyệt và trong mọi bản ghi màn hình.
    """
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])
    student = make_student(db)
    created = client.post("/accounts", headers=headers, json=_payload(student.id)).json()

    detail = client.get(f"/accounts/{created['id']}", headers=headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["email"] == "new-student@example.com"
    assert body["role"] == "STUDENT"
    assert body["status"] == "ACTIVE"
    assert not any("password" in key or "hash" in key for key in body)

    # Chiều đọc và chiều ghi của liên kết đối xứng: `PATCH /accounts/{id}`
    # **nhận** `student_id`, nên màn hình đọc lại được nó ở cùng chỗ.
    assert body["student_id"] == student.id
    assert body["trainer_id"] is None
    # Và khớp với chiều đọc từ phía học viên — hai đường, một sự thật.
    linked = client.get(f"/students/{student.id}", headers=headers).json()
    assert linked["user_id"] == created["id"]


def test_reading_an_unknown_account_is_a_404(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])
    assert client.get("/accounts/999999", headers=headers).status_code == 404


@pytest.mark.parametrize("role", [Role.STAFF, Role.TRAINER, Role.STUDENT])
def test_only_admin_reads_account_details(
    client: TestClient, db: Session, role: Role
) -> None:
    """Kể cả lễ tân: danh sách tài khoản là bản đồ ai có quyền gì trong studio."""
    admin = make_user(db, Role.ADMIN)
    admin_headers = auth_header(login(client, admin.email)["access_token"])
    other = make_user(db, role, email=f"{role.value.lower()}-chi-tiet@example.com")

    response = client.get(
        f"/accounts/{admin.id}",
        headers=auth_header(login(client, other.email)["access_token"]),
    )
    assert response.status_code == 403
    # Và admin vẫn đọc được — 403 ở trên là ranh giới, không phải endpoint hỏng.
    assert client.get(f"/accounts/{admin.id}", headers=admin_headers).status_code == 200


def test_account_links_are_readable_the_moment_they_are_written(
    client: TestClient, db: Session
) -> None:
    """Tài khoản vừa tạo/vừa nối trả về liên kết **ngay trong response đó**.

    Đây là lúc màn hình cần con số ấy nhất: admin bấm "cấp tài khoản" rồi điều
    hướng thẳng sang hồ sơ vừa nối. Trả `null` một lần ở đúng bước đó buộc giao
    diện phải tải lại, và bước tải lại nào cũng có thể quên.
    """
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])

    linked_now = make_student(db, "Nối Ngay")
    created = client.post(
        "/accounts",
        headers=headers,
        json=_payload(linked_now.id, email="noi-ngay@example.com"),
    ).json()
    assert created["student_id"] == linked_now.id

    # Tài khoản cũ chưa nối: đọc ra `null`, rồi PATCH trả về liên kết mới.
    orphan = make_user(db, Role.STUDENT, email="chua-noi@example.com")
    assert client.get(f"/accounts/{orphan.id}", headers=headers).json()["student_id"] is None

    later = make_student(db, "Nối Sau")
    patched = client.patch(
        f"/accounts/{orphan.id}", headers=headers, json={"student_id": later.id}
    ).json()
    assert patched["student_id"] == later.id


def test_the_account_list_reports_links_without_querying_per_row(
    client: TestClient, db: Session
) -> None:
    """Danh sách trả liên kết của từng dòng, và tra chúng bằng **hai** truy vấn.

    Tra từng dòng một là 2 truy vấn mỗi tài khoản — một trang 50 dòng thành 100
    lượt đi CSDL, và chi phí đó chỉ lộ ra khi studio đã có đủ người dùng.
    """
    from sqlalchemy import event

    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])
    for index in range(3):
        student = make_student(db, f"Học viên Danh Sách {index}", phone=f"09020000{index}0")
        client.post(
            "/accounts", headers=headers, json=_payload(student.id, email=f"ds{index}@example.com")
        )
    trainer_user = make_user(db, Role.TRAINER, email="hlv-danh-sach@example.com")
    client.post(
        "/trainers",
        headers=headers,
        json={"full_name": "HLV Danh Sách", "user_id": trainer_user.id},
    )

    statements: list[str] = []

    def record(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(db.get_bind(), "before_cursor_execute", record)
    try:
        rows = client.get("/accounts", headers=headers).json()
    finally:
        event.remove(db.get_bind(), "before_cursor_execute", record)

    by_email = {row["email"]: row for row in rows}
    assert by_email["ds0@example.com"]["student_id"] is not None
    assert by_email["hlv-danh-sach@example.com"]["trainer_id"] is not None
    assert by_email[admin.email]["student_id"] is None
    assert by_email[admin.email]["trainer_id"] is None

    # Một truy vấn cho trang tài khoản, một cho `student`, một cho `trainer`.
    # SQL do SQLAlchemy sinh có xuống dòng, nên so bằng regex chứ không bằng
    # chuỗi con — `" FROM student"` không khớp `"\nFROM student"`.
    lookups = [s for s in statements if re.search(r"\bFROM (student|trainer)\b", s)]
    assert len(lookups) == 2, statements
