"""Ma trận phân quyền và thu hồi phiên (F01).

Ba quy tắc dễ làm sai nhất, mỗi quy tắc có test riêng và **có test âm**:
HLV chỉ thấy lớp mình dạy · học viên chỉ thấy dữ liệu của mình ·
STAFF không xem được ảnh tiến trình.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError
from app.core.permissions import (
    Actor,
    assert_can_read_student,
    assert_can_view_progress_photos,
    assert_trainer_owns_session,
    is_assigned_trainer,
)
from app.domain.rules import BookingStatus, ClassType, Role, now
from app.models.money import StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession
from tests.conftest import auth_header, login, make_user


def _actor(db: Session, role: Role, email: str) -> Actor:
    user = make_user(db, role, email=email)
    return Actor(user=user)


def _student(db: Session, name: str, phone: str, user_id: int | None = None) -> Student:
    student = Student(full_name=name, phone=phone, user_id=user_id)
    db.add(student)
    db.commit()
    return student


def _trainer(db: Session, name: str, user_id: int | None = None) -> Trainer:
    trainer = Trainer(full_name=name, user_id=user_id)
    db.add(trainer)
    db.commit()
    return trainer


def _booked_session(
    db: Session, trainer: Trainer, student: Student, admin_id: int
) -> ClassSession:
    """Dựng một buổi lớp đã có học viên đăng ký — đủ để HLV thành 'phụ trách'."""
    package = StudentPackage(
        student_id=student.id,
        name_snapshot="Gói Demo",
        price_snapshot=Decimal("1000000.00"),
        credits_snapshot=10,
        class_type_snapshot=ClassType.GROUP,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        balance_cached=0,
    )
    db.add(package)
    db.flush()

    starts = now() + timedelta(days=1)
    class_session = ClassSession(
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        created_by=admin_id,
    )
    db.add(class_session)
    db.flush()
    db.add(
        Booking(
            class_session_id=class_session.id,
            student_id=student.id,
            student_package_id=package.id,
            booked_by_user_id=admin_id,
            status=BookingStatus.BOOKED,
        )
    )
    db.commit()
    return class_session


# --- Ảnh tiến trình ----------------------------------------------------------


def test_admin_can_view_progress_photos(db: Session) -> None:
    admin = _actor(db, Role.ADMIN, "admin@example.com")
    student = _student(db, "Học viên Demo 01", "0900000001")
    assert_can_view_progress_photos(db, admin, student.id)


def test_student_can_view_own_progress_photos(db: Session) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    student = _student(db, "Học viên Demo 01", "0900000001", user_id=user.id)
    actor = Actor(user=user, student_id=student.id)
    assert_can_view_progress_photos(db, actor, student.id)


def test_student_cannot_view_other_students_photos(db: Session) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    mine = _student(db, "Học viên Demo 01", "0900000001", user_id=user.id)
    other = _student(db, "Học viên Demo 02", "0900000002")
    actor = Actor(user=user, student_id=mine.id)

    with pytest.raises(ForbiddenError):
        assert_can_view_progress_photos(db, actor, other.id)


def test_staff_cannot_view_progress_photos(db: Session) -> None:
    """Test âm bắt buộc: đáp án của khách không có STAFF trong danh sách được xem.

    Bản ma trận trước cho STAFF ✓ — nghĩa là mọi lễ tân xem được ảnh cơ thể
    của toàn bộ học viên.
    """
    staff = _actor(db, Role.STAFF, "staff@example.com")
    student = _student(db, "Học viên Demo 01", "0900000001")

    with pytest.raises(ForbiddenError):
        assert_can_view_progress_photos(db, staff, student.id)


def test_unassigned_trainer_cannot_view_progress_photos(db: Session) -> None:
    """Test âm bắt buộc: HLV chưa từng dạy học viên đó không được xem."""
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = _trainer(db, "HLV Demo 01", user_id=user.id)
    student = _student(db, "Học viên Demo 01", "0900000001")
    actor = Actor(user=user, trainer_id=trainer.id)

    assert not is_assigned_trainer(db, trainer.id, student.id)
    with pytest.raises(ForbiddenError):
        assert_can_view_progress_photos(db, actor, student.id)


def test_assigned_trainer_can_view_progress_photos(db: Session) -> None:
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = _trainer(db, "HLV Demo 01", user_id=user.id)
    student = _student(db, "Học viên Demo 01", "0900000001")
    _booked_session(db, trainer, student, admin.id)
    actor = Actor(user=user, trainer_id=trainer.id)

    assert is_assigned_trainer(db, trainer.id, student.id)
    assert_can_view_progress_photos(db, actor, student.id)


# --- Dữ liệu học viên --------------------------------------------------------


def test_trainer_cannot_read_student_records(db: Session) -> None:
    """Ma trận F01: dòng "Học viên, gói, thanh toán, sổ buổi" không có TRAINER."""
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = _trainer(db, "HLV Demo 01", user_id=user.id)
    student = _student(db, "Học viên Demo 01", "0900000001")
    actor = Actor(user=user, trainer_id=trainer.id)

    with pytest.raises(ForbiddenError):
        assert_can_read_student(actor, student.id)


def test_student_cannot_read_other_student_records(db: Session) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    mine = _student(db, "Học viên Demo 01", "0900000001", user_id=user.id)
    other = _student(db, "Học viên Demo 02", "0900000002")
    actor = Actor(user=user, student_id=mine.id)

    assert_can_read_student(actor, mine.id)
    with pytest.raises(ForbiddenError):
        assert_can_read_student(actor, other.id)


def test_staff_can_read_any_student_record(db: Session) -> None:
    staff = _actor(db, Role.STAFF, "staff@example.com")
    student = _student(db, "Học viên Demo 01", "0900000001")
    assert_can_read_student(staff, student.id)


# --- Lớp ---------------------------------------------------------------------


def test_trainer_cannot_act_on_another_trainers_session(db: Session) -> None:
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    mine = _trainer(db, "HLV Demo 01", user_id=user.id)
    theirs = _trainer(db, "HLV Demo 02")
    student = _student(db, "Học viên Demo 01", "0900000001")
    their_session = _booked_session(db, theirs, student, admin.id)
    actor = Actor(user=user, trainer_id=mine.id)

    with pytest.raises(ForbiddenError):
        assert_trainer_owns_session(db, actor, their_session.id)


def test_trainer_can_act_on_own_session(db: Session) -> None:
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = _trainer(db, "HLV Demo 01", user_id=user.id)
    student = _student(db, "Học viên Demo 01", "0900000001")
    my_session = _booked_session(db, trainer, student, admin.id)
    actor = Actor(user=user, trainer_id=trainer.id)

    assert_trainer_owns_session(db, actor, my_session.id)


# --- Quản lý tài khoản: chỉ ADMIN --------------------------------------------


@pytest.mark.parametrize("role", [Role.STAFF, Role.TRAINER, Role.STUDENT])
def test_non_admin_cannot_manage_accounts(
    client: TestClient, db: Session, role: Role
) -> None:
    user = make_user(db, role, email=f"{role.value.lower()}@example.com")
    token = login(client, user.email)["access_token"]
    assert client.get("/accounts", headers=auth_header(token)).status_code == 403


def test_admin_can_manage_accounts(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    token = login(client, admin.email)["access_token"]
    assert client.get("/accounts", headers=auth_header(token)).status_code == 200


def test_endpoints_reject_anonymous_requests(client: TestClient) -> None:
    assert client.get("/accounts").status_code == 401
    assert client.get("/auth/me").status_code == 401


# --- Thu hồi phiên -----------------------------------------------------------


def test_locking_account_invalidates_live_tokens(client: TestClient, db: Session) -> None:
    """Khoá tài khoản phải làm **access token và refresh token đang cầm** chết ngay.

    Không có bước này, nhân viên nghỉ việc chiều thứ Sáu vẫn đọc được PII học
    viên suốt cuối tuần bằng cặp token đang giữ.
    """
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    staff = make_user(db, Role.STAFF, email="staff@example.com")

    staff_tokens = login(client, staff.email)
    staff_header = auth_header(staff_tokens["access_token"])
    assert client.get("/auth/me", headers=staff_header).status_code == 200

    admin_token = login(client, admin.email)["access_token"]
    locked = client.post(f"/accounts/{staff.id}/lock", headers=auth_header(admin_token))
    assert locked.status_code == 200

    assert client.get("/auth/me", headers=staff_header).status_code == 401
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": staff_tokens["refresh_token"]}
        ).status_code
        == 401
    )


def test_admin_cannot_lock_self(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    token = login(client, admin.email)["access_token"]
    response = client.post(f"/accounts/{admin.id}/lock", headers=auth_header(token))
    assert response.status_code == 409


def test_created_account_without_password_is_pending(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    token = login(client, admin.email)["access_token"]

    from unittest.mock import patch

    with patch("app.api.accounts.send_password_reset") as sender:
        response = client.post(
            "/accounts",
            json={"email": "nhanvien.moi@example.com", "role": "STAFF"},
            headers=auth_header(token),
        )
    assert response.status_code == 201
    assert response.json()["status"] == "PENDING_ACTIVATION"
    assert "token" not in response.text.lower()
    sender.assert_called_once()
