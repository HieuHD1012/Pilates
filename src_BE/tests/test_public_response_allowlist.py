"""Endpoint công khai không được trả PII ngoài allow-list (F02).

Bộ test này **khoá danh sách trường** lại. Thêm một trường vào response công
khai mà không sửa test ở đây là test đỏ — đó là mục đích, vì đường mặc định
của FastAPI (tái dùng schema nội bộ) sẽ lặng lẽ đẩy số điện thoại HLV ra ngoài.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import ClassType, Role, now
from app.models.money import PackageType
from app.models.people import Announcement, Trainer
from tests.conftest import make_user

#: Đúng ba trường. `phone`, `id`, `user_id`, `specialties`, `is_public`,
#: `is_active` đều **không** được xuất hiện.
PUBLIC_TRAINER_FIELDS = {"full_name", "photo_key", "bio"}
PUBLIC_ANNOUNCEMENT_FIELDS = {"title", "body", "publish_at"}
PUBLIC_PACKAGE_FIELDS = {"name", "price", "credits", "duration_days", "class_type"}

PRIVATE_PHONE = "0912345678"


def _trainer(db: Session, **kwargs) -> Trainer:
    trainer = Trainer(
        full_name=kwargs.pop("full_name", "HLV Demo 01"),
        phone=kwargs.pop("phone", PRIVATE_PHONE),
        bio=kwargs.pop("bio", "Hướng dẫn Pilates cơ bản và nâng cao."),
        specialties=kwargs.pop("specialties", "Reformer, Mat"),
        is_public=kwargs.pop("is_public", True),
        is_active=kwargs.pop("is_active", True),
        **kwargs,
    )
    db.add(trainer)
    db.commit()
    return trainer


def test_public_trainers_expose_only_allowlisted_fields(
    client: TestClient, db: Session
) -> None:
    _trainer(db)
    response = client.get("/public/trainers")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert set(body[0]) == PUBLIC_TRAINER_FIELDS


def test_public_trainers_never_leak_phone_number(client: TestClient, db: Session) -> None:
    """Số điện thoại cá nhân của HLV không được ra trang công khai dưới mọi dạng."""
    _trainer(db)
    response = client.get("/public/trainers")
    assert PRIVATE_PHONE not in response.text


def test_public_trainers_hide_non_public_and_inactive(
    client: TestClient, db: Session
) -> None:
    _trainer(db, full_name="HLV Riêng Tư", is_public=False, phone="0900000011")
    _trainer(db, full_name="HLV Đã Nghỉ", is_active=False, phone="0900000012")

    body = client.get("/public/trainers").json()
    assert body == []


def test_public_endpoints_need_no_authentication(client: TestClient, db: Session) -> None:
    for path in ("/public/trainers", "/public/announcements", "/public/packages"):
        assert client.get(path).status_code == 200, path


def test_public_announcements_expose_only_allowlisted_fields(
    client: TestClient, db: Session
) -> None:
    admin = make_user(db, Role.ADMIN)
    db.add(
        Announcement(
            title="Lịch nghỉ lễ",
            body="Studio nghỉ ngày 02/09.",
            is_published=True,
            created_by=admin.id,
        )
    )
    db.commit()

    body = client.get("/public/announcements").json()
    assert len(body) == 1
    assert set(body[0]) == PUBLIC_ANNOUNCEMENT_FIELDS


def test_unpublished_announcements_stay_hidden(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    db.add(
        Announcement(
            title="Bản nháp",
            body="Chưa đăng.",
            is_published=False,
            created_by=admin.id,
        )
    )
    db.commit()

    assert client.get("/public/announcements").json() == []


def test_scheduled_announcement_stays_hidden_until_publish_time(
    client: TestClient, db: Session
) -> None:
    """Hẹn giờ đăng mà vẫn lộ ngay thì cái hẹn giờ vô nghĩa."""
    admin = make_user(db, Role.ADMIN)
    db.add(
        Announcement(
            title="Khuyến mãi tháng sau",
            body="Nội dung chưa tới giờ đăng.",
            is_published=True,
            publish_at=now() + timedelta(days=3),
            created_by=admin.id,
        )
    )
    db.commit()

    assert client.get("/public/announcements").json() == []


def test_public_packages_expose_only_allowlisted_fields(
    client: TestClient, db: Session
) -> None:
    db.add(
        PackageType(
            name="Group 10 buổi",
            price=Decimal("2500000.00"),
            credits=10,
            duration_days=90,
            class_type=ClassType.GROUP,
        )
    )
    db.commit()

    body = client.get("/public/packages").json()
    assert len(body) == 1
    assert set(body[0]) == PUBLIC_PACKAGE_FIELDS
    # Chuỗi thập phân: tiền không đi qua float, và "chưa có giá" (null)
    # phải phân biệt được với "0".
    assert body[0]["price"] == "2500000.00"


def test_packages_not_for_sale_are_hidden(client: TestClient, db: Session) -> None:
    db.add(
        PackageType(
            name="Gói cũ",
            price=Decimal("1000000.00"),
            credits=5,
            duration_days=30,
            class_type=ClassType.GROUP,
            is_selling=False,
        )
    )
    db.commit()

    assert client.get("/public/packages").json() == []


def test_trainer_photo_is_not_served_once_trainer_leaves_the_public_page(
    client: TestClient, db: Session
) -> None:
    """Gỡ HLV khỏi trang công khai thì ảnh phải biến mất theo.

    Không có phép kiểm này, ảnh vẫn sống với bất kỳ ai còn giữ đường dẫn.
    """
    trainer = _trainer(db, is_public=False, phone="0900000013")
    trainer.photo_key = "trainer/" + "a" * 32
    db.commit()

    response = client.get(f"/public/trainer-photos/{trainer.photo_key}")
    assert response.status_code == 404
