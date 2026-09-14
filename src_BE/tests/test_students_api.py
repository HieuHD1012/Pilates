"""Hồ sơ học viên, số buổi hiển thị và chuyển đổi khách quan tâm (F02/F03)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import ClassType, LedgerReason, PackageStatus, Role, today
from app.models.money import CreditLedger, StudentPackage
from app.models.people import Lead, Student
from tests.conftest import auth_header, login, make_user


def _headers(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


def _student(db: Session, name: str = "Học viên Demo 01", phone: str = "0900000001",
             user_id: int | None = None) -> Student:
    student = Student(full_name=name, phone=phone, user_id=user_id)
    db.add(student)
    db.commit()
    return student


def _package_with_credits(
    db: Session,
    student: Student,
    actor_id: int,
    *,
    credits: int,
    start: date | None = None,
    end: date | None = None,
    status: PackageStatus = PackageStatus.ACTIVE,
    class_type: ClassType = ClassType.GROUP,
) -> StudentPackage:
    package = StudentPackage(
        student_id=student.id,
        name_snapshot="Gói Demo",
        price_snapshot=Decimal("2500000.00"),
        credits_snapshot=max(credits, 1),
        class_type_snapshot=class_type,
        start_date=start or today() - timedelta(days=10),
        end_date=end or today() + timedelta(days=80),
        status=status,
        balance_cached=0,
    )
    db.add(package)
    db.flush()
    if credits:
        db.add(
            CreditLedger(
                student_package_id=package.id,
                delta=credits,
                reason_code=LedgerReason.PACKAGE_SOLD,
                actor_user_id=actor_id,
            )
        )
        package.balance_cached = credits
    db.commit()
    return package


# --- CRUD và số điện thoại trùng --------------------------------------------


def test_staff_can_create_student(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/students",
        headers=_headers(client, staff),
        json={"full_name": "Học viên Demo 01", "phone": "0900000001"},
    )
    assert response.status_code == 201
    assert response.json()["phone"] == "0900000001"


def test_duplicate_phone_names_the_existing_record(client: TestClient, db: Session) -> None:
    """Chỉ báo "số đã tồn tại" thì nhân viên phải tự đi tìm hồ sơ trùng."""
    staff = make_user(db, Role.STAFF)
    existing = _student(db, name="Học viên Demo 07", phone="0900000001")

    response = client.post(
        "/students",
        headers=_headers(client, staff),
        json={"full_name": "Người khác", "phone": "0900000001"},
    )
    assert response.status_code == 409
    detail = response.json()["detail"]
    assert detail["code"] == "STUDENT_PHONE_TAKEN"
    assert str(existing.id) in detail["message"]
    assert "Học viên Demo 07" in detail["message"]


def test_update_allows_keeping_own_phone(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    student = _student(db)

    response = client.patch(
        f"/students/{student.id}",
        headers=_headers(client, staff),
        json={"phone": "0900000001", "full_name": "Học viên Demo 01 (đã sửa)"},
    )
    assert response.status_code == 200


def test_student_name_is_sanitized(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/students",
        headers=_headers(client, staff),
        json={
            "full_name": "<script>alert(1)</script>Học viên Demo 01",
            "phone": "0900000009",
        },
    )
    assert response.status_code == 201
    assert response.json()["full_name"] == "Học viên Demo 01"


# --- Phân quyền theo chủ sở hữu ---------------------------------------------


def test_student_list_is_scoped_at_query_level(client: TestClient, db: Session) -> None:
    """Học viên đăng nhập chỉ thấy chính mình trong danh sách."""
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    mine = _student(db, user_id=user.id)
    _student(db, name="Học viên Demo 02", phone="0900000002")

    body = client.get("/students", headers=_headers(client, user)).json()
    assert [row["id"] for row in body] == [mine.id]


def test_student_cannot_read_another_student_by_id(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    _student(db, user_id=user.id)
    other = _student(db, name="Học viên Demo 02", phone="0900000002")

    response = client.get(f"/students/{other.id}", headers=_headers(client, user))
    assert response.status_code == 403


def test_trainer_cannot_read_student_records(client: TestClient, db: Session) -> None:
    trainer = make_user(db, Role.TRAINER)
    student = _student(db)
    response = client.get(f"/students/{student.id}", headers=_headers(client, trainer))
    assert response.status_code == 403


def test_student_cannot_create_students(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    response = client.post(
        "/students",
        headers=_headers(client, user),
        json={"full_name": "Tự tạo", "phone": "0900000099"},
    )
    assert response.status_code == 403


# --- Số buổi hiển thị --------------------------------------------------------


def test_overview_counts_only_active_packages(client: TestClient, db: Session) -> None:
    """Gói hết hạn còn buổi **không** bị thu hồi nhưng cũng **không** vào số dư.

    Tính cả thì màn hình báo "còn 4 buổi" trên một gói đã chết, và tiêu chí
    "số buổi hiển thị chính xác" sai một cách âm thầm.
    """
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    _package_with_credits(db, student, admin.id, credits=6)
    expired = _package_with_credits(
        db,
        student,
        admin.id,
        credits=4,
        start=today() - timedelta(days=200),
        end=today() - timedelta(days=1),
    )

    body = client.get(
        f"/students/{student.id}/overview", headers=_headers(client, admin)
    ).json()

    assert body["credits_remaining"] == 6
    assert expired.id not in [p["id"] for p in body["active_packages"]]

    # Buổi của gói hết hạn vẫn còn nguyên trong sổ — chỉ là không hiển thị.
    from app.services.credit_balance import package_ledger_total

    assert package_ledger_total(db, expired.id) == 4


def test_overview_excludes_package_with_zero_balance(
    client: TestClient, db: Session
) -> None:
    """Gói còn hạn nhưng đã tiêu hết buổi thì không còn "đang hoạt động"."""
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    _package_with_credits(db, student, admin.id, credits=0)

    body = client.get(
        f"/students/{student.id}/overview", headers=_headers(client, admin)
    ).json()
    assert body["credits_remaining"] == 0
    assert body["active_packages"] == []


def test_overview_excludes_package_not_yet_started(
    client: TestClient, db: Session
) -> None:
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    _package_with_credits(
        db,
        student,
        admin.id,
        credits=10,
        start=today() + timedelta(days=5),
        end=today() + timedelta(days=95),
    )

    body = client.get(
        f"/students/{student.id}/overview", headers=_headers(client, admin)
    ).json()
    assert body["credits_remaining"] == 0


def test_overview_balance_matches_ledger_after_deduction(
    client: TestClient, db: Session
) -> None:
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    package = _package_with_credits(db, student, admin.id, credits=10)

    db.add(
        CreditLedger(
            student_package_id=package.id,
            delta=-3,
            reason_code=LedgerReason.ADMIN_ADJUST,
            note="Điều chỉnh thử.",
            actor_user_id=admin.id,
        )
    )
    package.balance_cached = 7
    db.commit()

    body = client.get(
        f"/students/{student.id}/overview", headers=_headers(client, admin)
    ).json()
    assert body["credits_remaining"] == 7


@pytest.mark.parametrize(
    ("credits", "days_left", "expected", "label"),
    [
        (6, 60, True, "chạm ngưỡng buổi"),
        (20, 15, True, "chỉ chạm ngưỡng ngày"),
        (5, 80, True, "chỉ chạm ngưỡng buổi"),
        (20, 60, False, "chưa chạm ngưỡng nào"),
    ],
)
def test_renewal_threshold_is_or_not_and(
    client: TestClient, db: Session, credits: int, days_left: int, expected: bool, label: str
) -> None:
    """Ngưỡng là ≤6 buổi **HOẶC** ≤15 ngày.

    Hiểu nhầm thành VÀ sẽ bỏ sót đúng những người cần gọi: còn 20 buổi nhưng
    hết hạn sau 10 ngày.
    """
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    _package_with_credits(
        db, student, admin.id, credits=credits, end=today() + timedelta(days=days_left)
    )

    body = client.get(
        f"/students/{student.id}/overview", headers=_headers(client, admin)
    ).json()
    assert body["needs_renewal"] is expected, label


# --- Chuyển khách quan tâm thành học viên ------------------------------------


def test_convert_lead_keeps_consultation_history(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    lead = Lead(full_name="Khách Demo 01", phone="0900000055", need="Muốn tập buổi tối")
    db.add(lead)
    db.commit()

    response = client.post(f"/leads/{lead.id}/convert", headers=_headers(client, staff))
    assert response.status_code == 201
    student_id = response.json()["id"]
    assert response.json()["note"] == "Muốn tập buổi tối"

    db.refresh(lead)
    assert lead.converted_student_id == student_id
    assert lead.status == "CONVERTED"


def test_converting_twice_is_rejected(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    lead = Lead(full_name="Khách Demo 01", phone="0900000055")
    db.add(lead)
    db.commit()
    headers = _headers(client, staff)

    assert client.post(f"/leads/{lead.id}/convert", headers=headers).status_code == 201
    second = client.post(f"/leads/{lead.id}/convert", headers=headers)
    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "LEAD_ALREADY_CONVERTED"


def test_convert_blocked_when_phone_already_a_student(
    client: TestClient, db: Session
) -> None:
    staff = make_user(db, Role.STAFF)
    existing = _student(db, name="Học viên Demo 07", phone="0900000055")
    lead = Lead(full_name="Khách Demo 01", phone="0900000055")
    db.add(lead)
    db.commit()

    response = client.post(f"/leads/{lead.id}/convert", headers=_headers(client, staff))
    assert response.status_code == 409
    assert str(existing.id) in response.json()["detail"]["message"]
