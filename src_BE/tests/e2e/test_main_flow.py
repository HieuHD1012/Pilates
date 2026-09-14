"""Luồng chính đầu-cuối, chạy qua HTTP như người dùng thật.

    bán gói → cộng buổi → đăng ký → trừ buổi
            → hủy đúng hạn → hoàn buổi
            → hủy muộn     → bị khóa
            → lớp đầy → từ chối đăng ký, không trừ buổi
            → studio hủy lớp → hoàn cho mọi người

Bộ test theo tầng service ở các file khác kiểm từng mắt xích. File này kiểm
**chuỗi**: mỗi bước đi qua tầng HTTP, phân quyền, schema và transaction thật,
và sau **mỗi** bước sổ buổi phải khớp. Lỗi tích luỹ chỉ lộ ra ở đây — từng
bước đúng không đảm bảo chuỗi đúng.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import ClassType, Role, now
from app.services import credit_ledger
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import auth_header, login, make_user
from tests.factories import make_session, make_student_account, make_trainer


@pytest.fixture
def stage(db: Session, client: TestClient):
    """Một studio nhỏ: admin, nhân viên, HLV, hai học viên, hai buổi lớp."""
    admin = make_user(db, Role.ADMIN)
    staff = make_user(db, Role.STAFF, email="letan@example.com")
    trainer = make_trainer(db, "HLV Ngọc Mai")
    lan, lan_user = make_student_account(db, "Nguyễn Thị Lan", "lan@example.com")
    minh, minh_user = make_student_account(db, "Trần Văn Minh", "minh@example.com")

    tomorrow = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1), capacity=1)
    later = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=2), capacity=1)
    soon = make_session(db, trainer, admin.id, starts_at=now() + timedelta(hours=2), capacity=2)
    db.commit()

    return {
        "admin_token": login(client, admin.email)["access_token"],
        "staff_token": login(client, staff.email)["access_token"],
        "lan_token": login(client, lan_user.email)["access_token"],
        "minh_token": login(client, minh_user.email)["access_token"],
        "lan": lan,
        "minh": minh,
        "tomorrow": tomorrow,
        "later": later,
        "soon": soon,
    }


def _sell(client: TestClient, token: str, student_id: int, credits: int) -> dict:
    response = client.post(
        "/package-types",
        json={
            "name": f"Gói {credits} buổi",
            "price": "2500000.00",
            "credits": credits,
            "duration_days": 90,
            "class_type": ClassType.GROUP.value,
        },
        headers=auth_header(token),
    )
    assert response.status_code == 201, response.text
    package_type_id = response.json()["id"]

    response = client.post(
        "/packages/sell",
        json={"student_id": student_id, "package_type_id": package_type_id},
        headers=auth_header(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_the_whole_journey_keeps_the_ledger_balanced_at_every_step(
    db: Session, client: TestClient, stage
) -> None:
    admin = stage["admin_token"]
    lan = auth_header(stage["lan_token"])
    minh = auth_header(stage["minh_token"])
    package = _sell(client, admin, stage["lan"].id, 5)
    _sell(client, admin, stage["minh"].id, 5)
    assert_ledger_is_sound(db)
    response = client.post(
        "/bookings", headers=lan, json={"class_session_id": stage["tomorrow"].id}
    )
    assert response.status_code == 201, response.text
    booking_id = response.json()["booking"]["id"]
    assert response.json()["credits_remaining"] == 4
    assert_ledger_is_sound(db)
    response = client.post(f"/bookings/{booking_id}/cancel", headers=lan)
    assert response.status_code == 200
    assert response.json()["refunded"] is True
    assert_ledger_is_sound(db)
    response = client.post("/bookings", headers=lan, json={"class_session_id": stage["soon"].id})
    soon_id = response.json()["booking"]["id"]
    assert response.status_code == 201
    assert_ledger_is_sound(db)
    assert (
        client.post(f"/bookings/{soon_id}/cancel", headers=lan).json()["detail"]["code"]
        == "CANCELLATION_CLOSED"
    )
    response = client.post("/bookings", headers=lan, json={"class_session_id": stage["later"].id})
    assert response.status_code == 201
    assert_ledger_is_sound(db)
    response = client.post("/bookings", headers=minh, json={"class_session_id": stage["later"].id})
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "SESSION_FULL"
    response = client.post(
        f"/classes/{stage['later'].id}/cancel",
        headers=auth_header(admin),
        json={"reason": "Studio nghỉ"},
    )
    assert response.status_code == 200
    assert credit_ledger.balance_of(db, package["id"]) == 4
    assert_ledger_is_sound(db)
