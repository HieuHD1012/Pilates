"""Quyền trên ảnh tiến trình, kiểm qua HTTP (F03).

`test_permissions.py` kiểm hàm quyền; ở đây kiểm **đường đi thật qua API** —
vì một hàm quyền đúng mà endpoint quên gọi thì cũng bằng không.

Bốn vai, và ba trong số đó phải bị từ chối ở ít nhất một tình huống.
"""

from __future__ import annotations

import io
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from app.domain.rules import BookingStatus, ClassType, Role, now
from app.models.money import StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession
from tests.conftest import auth_header, login, make_user


def _photo_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (48, 48), (200, 180, 160)).save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def scenario(db: Session) -> dict:
    """Một studio thu nhỏ: hai học viên, hai HLV, một lớp đã có người đăng ký.

    HLV 1 dạy lớp mà học viên 1 đã đặt → là "HLV phụ trách" của học viên 1.
    HLV 2 chưa từng dạy ai.
    """
    admin = make_user(db, Role.ADMIN, email="admin@example.com")
    staff = make_user(db, Role.STAFF, email="staff@example.com")
    trainer_user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    other_trainer_user = make_user(db, Role.TRAINER, email="hlv2@example.com")
    student_user = make_user(db, Role.STUDENT, email="hv1@example.com")
    other_student_user = make_user(db, Role.STUDENT, email="hv2@example.com")

    student = Student(full_name="Học viên Demo 01", phone="0900000001", user_id=student_user.id)
    other_student = Student(
        full_name="Học viên Demo 02", phone="0900000002", user_id=other_student_user.id
    )
    trainer = Trainer(full_name="HLV Demo 01", user_id=trainer_user.id)
    other_trainer = Trainer(full_name="HLV Demo 02", user_id=other_trainer_user.id)
    db.add_all([student, other_student, trainer, other_trainer])
    db.flush()

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
        created_by=admin.id,
    )
    db.add(class_session)
    db.flush()
    db.add(
        Booking(
            class_session_id=class_session.id,
            student_id=student.id,
            student_package_id=package.id,
            booked_by_user_id=admin.id,
            status=BookingStatus.BOOKED,
        )
    )
    db.commit()

    return {
        "admin": admin,
        "staff": staff,
        "assigned_trainer": trainer_user,
        "unassigned_trainer": other_trainer_user,
        "student": student_user,
        "other_student": other_student_user,
        "student_id": student.id,
        "other_student_id": other_student.id,
    }


def _token(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


def _upload(client: TestClient, headers: dict, student_id: int):
    return client.post(
        f"/students/{student_id}/progress-photos",
        headers=headers,
        files={"file": ("anh.jpg", _photo_bytes(), "image/jpeg")},
    )


# --- Ai được xem -------------------------------------------------------------


def test_admin_can_upload_and_read(client: TestClient, scenario: dict) -> None:
    headers = _token(client, scenario["admin"])
    student_id = scenario["student_id"]

    created = _upload(client, headers, student_id)
    assert created.status_code == 201

    listed = client.get(f"/students/{student_id}/progress-photos", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    photo_id = created.json()["id"]
    file_response = client.get(
        f"/students/{student_id}/progress-photos/{photo_id}/file", headers=headers
    )
    assert file_response.status_code == 200
    assert file_response.headers["content-type"] == "image/jpeg"


def test_student_can_read_own_photos(client: TestClient, scenario: dict) -> None:
    admin_headers = _token(client, scenario["admin"])
    _upload(client, admin_headers, scenario["student_id"])

    headers = _token(client, scenario["student"])
    response = client.get(
        f"/students/{scenario['student_id']}/progress-photos", headers=headers
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_assigned_trainer_can_read(client: TestClient, scenario: dict) -> None:
    admin_headers = _token(client, scenario["admin"])
    _upload(client, admin_headers, scenario["student_id"])

    headers = _token(client, scenario["assigned_trainer"])
    response = client.get(
        f"/students/{scenario['student_id']}/progress-photos", headers=headers
    )
    assert response.status_code == 200


# --- Ai bị từ chối (test âm bắt buộc) ----------------------------------------


def test_staff_cannot_read_progress_photos(client: TestClient, scenario: dict) -> None:
    """Đáp án của khách không có STAFF trong danh sách được xem.

    Bản ma trận trước cho `STAFF ✓` — nghĩa là mọi lễ tân xem được ảnh cơ thể
    của toàn bộ học viên.
    """
    headers = _token(client, scenario["staff"])
    response = client.get(
        f"/students/{scenario['student_id']}/progress-photos", headers=headers
    )
    assert response.status_code == 403


def test_staff_cannot_upload_progress_photos(client: TestClient, scenario: dict) -> None:
    headers = _token(client, scenario["staff"])
    assert _upload(client, headers, scenario["student_id"]).status_code == 403


def test_unassigned_trainer_cannot_read(client: TestClient, scenario: dict) -> None:
    """HLV chưa từng dạy học viên đó không được xem ảnh của họ."""
    headers = _token(client, scenario["unassigned_trainer"])
    response = client.get(
        f"/students/{scenario['student_id']}/progress-photos", headers=headers
    )
    assert response.status_code == 403


def test_student_cannot_read_another_students_photos(
    client: TestClient, scenario: dict
) -> None:
    headers = _token(client, scenario["student"])
    response = client.get(
        f"/students/{scenario['other_student_id']}/progress-photos", headers=headers
    )
    assert response.status_code == 403


def test_anonymous_cannot_read(client: TestClient, scenario: dict) -> None:
    response = client.get(f"/students/{scenario['student_id']}/progress-photos")
    assert response.status_code == 401


def test_photo_of_another_student_not_reachable_through_own_path(
    client: TestClient, scenario: dict
) -> None:
    """Đổi id ảnh trong đường dẫn của mình không lấy được ảnh người khác.

    Nếu endpoint tra ảnh chỉ theo `photo_id` rồi mới kiểm quyền trên
    `student_id`, học viên B đọc được ảnh của A bằng cách ghép đường dẫn của
    chính mình với id ảnh của A.
    """
    admin_headers = _token(client, scenario["admin"])
    victim_photo_id = _upload(client, admin_headers, scenario["student_id"]).json()["id"]

    attacker_headers = _token(client, scenario["other_student"])
    response = client.get(
        f"/students/{scenario['other_student_id']}/progress-photos/{victim_photo_id}/file",
        headers=attacker_headers,
    )
    assert response.status_code == 404


# --- Nội dung phản hồi -------------------------------------------------------


def test_response_never_exposes_storage_key(client: TestClient, scenario: dict) -> None:
    """Khoá lưu không ra ngoài: ảnh chỉ lấy được qua endpoint kiểm quyền."""
    headers = _token(client, scenario["admin"])
    created = _upload(client, headers, scenario["student_id"])
    assert "storage_key" not in created.json()
    assert "progress/" not in created.text


def test_photo_file_is_not_cached_and_is_served_as_attachment(
    client: TestClient, scenario: dict
) -> None:
    headers = _token(client, scenario["admin"])
    photo_id = _upload(client, headers, scenario["student_id"]).json()["id"]

    response = client.get(
        f"/students/{scenario['student_id']}/progress-photos/{photo_id}/file",
        headers=headers,
    )
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["content-disposition"].startswith("attachment")


def test_non_image_upload_is_rejected_through_the_api(
    client: TestClient, scenario: dict
) -> None:
    headers = _token(client, scenario["admin"])
    response = client.post(
        f"/students/{scenario['student_id']}/progress-photos",
        headers=headers,
        files={"file": ("anh.jpg", b"<html><script>alert(1)</script></html>", "image/jpeg")},
    )
    assert response.status_code == 422


# --- Lỗ hổng phát hiện khi review M2 -----------------------------------------


def test_only_admin_can_delete_progress_photos(client: TestClient, scenario: dict) -> None:
    """Quyền xoá hẹp hơn quyền xem: xem là đọc, xoá là huỷ không hoàn tác."""
    admin_headers = _token(client, scenario["admin"])
    student_id = scenario["student_id"]
    photo_id = _upload(client, admin_headers, student_id).json()["id"]
    path = f"/students/{student_id}/progress-photos/{photo_id}"

    for role in ("student", "assigned_trainer", "staff"):
        headers = _token(client, scenario[role])
        assert client.delete(path, headers=headers).status_code == 403, role

    assert client.delete(path, headers=admin_headers).status_code == 204


def test_oversized_upload_is_rejected_before_being_read(
    client: TestClient, scenario: dict
) -> None:
    """Kiểm dung lượng trước khi nuốt cả body vào RAM.

    Đọc trọn body rồi mới kiểm nghĩa là một tài khoản hợp lệ gửi vài request
    rất lớn song song là đủ làm cạn bộ nhớ.
    """
    from app.config import get_settings

    oversized = b"\xff\xd8\xff" + b"\x00" * (get_settings().upload_max_bytes + 1)
    response = client.post(
        f"/students/{scenario['student_id']}/progress-photos",
        headers=_token(client, scenario["admin"]),
        files={"file": ("anh.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "UPLOAD_TOO_LARGE"


def test_rejected_upload_leaves_no_orphan_file(client: TestClient, scenario: dict) -> None:
    """Ảnh hỏng không được để lại tệp nào trên đĩa."""
    from pathlib import Path

    from app.config import get_settings

    storage = Path(get_settings().storage_dir) / "progress"
    before = set(storage.glob("*")) if storage.exists() else set()

    client.post(
        f"/students/{scenario['student_id']}/progress-photos",
        headers=_token(client, scenario["admin"]),
        files={"file": ("anh.jpg", b"<html>khong phai anh</html>", "image/jpeg")},
    )

    after = set(storage.glob("*")) if storage.exists() else set()
    assert after == before
