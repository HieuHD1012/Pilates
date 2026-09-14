"""Form tư vấn công khai và phân quyền hồ sơ HLV (F02/F04)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.rules import Role
from app.models.people import Lead, Trainer
from tests.conftest import auth_header, login, make_user


def _headers(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


def _lead_count(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(Lead)) or 0)


# --- Form tư vấn công khai ---------------------------------------------------


def test_anonymous_can_submit_lead(client: TestClient, db: Session) -> None:
    response = client.post(
        "/public/leads",
        json={"full_name": "Khách Demo 01", "phone": "0900000055", "need": "Tập buổi tối"},
    )
    assert response.status_code == 201
    assert _lead_count(db) == 1


def test_lead_input_is_sanitized(client: TestClient, db: Session) -> None:
    """Đường XSS lưu trữ ngắn nhất: khách ẩn danh gửi → nhân viên mở danh sách."""
    client.post(
        "/public/leads",
        json={
            "full_name": "Khách Demo 01",
            "phone": "0900000055",
            "need": '<script>fetch("/steal?t="+localStorage.token)</script>Tập buổi tối',
        },
    )
    lead = db.scalars(select(Lead)).one()
    assert lead.need == "Tập buổi tối"
    assert "<script>" not in lead.need


def test_duplicate_submission_within_window_creates_one_lead(
    client: TestClient, db: Session
) -> None:
    payload = {"full_name": "Khách Demo 01", "phone": "0900000055"}
    first = client.post("/public/leads", json=payload)
    second = client.post("/public/leads", json=payload)

    assert first.status_code == second.status_code == 201
    # Phản hồi giống hệt nhau: khách không cần biết số của họ đã có hay chưa.
    assert first.json() == second.json()
    assert _lead_count(db) == 1


def test_lead_form_is_rate_limited(client: TestClient) -> None:
    statuses = [
        client.post(
            "/public/leads",
            json={"full_name": f"Khách {index}", "phone": f"09000000{index:02d}"},
        ).status_code
        for index in range(14)
    ]
    assert 429 in statuses, statuses


def test_lead_list_requires_staff(client: TestClient, db: Session) -> None:
    student = make_user(db, Role.STUDENT, email="hv1@example.com")
    assert client.get("/leads").status_code == 401
    assert client.get("/leads", headers=_headers(client, student)).status_code == 403


def test_staff_can_read_and_update_leads(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    client.post("/public/leads", json={"full_name": "Khách Demo 01", "phone": "0900000055"})
    headers = _headers(client, staff)

    listed = client.get("/leads", headers=headers).json()
    assert len(listed) == 1

    updated = client.patch(
        f"/leads/{listed[0]['id']}",
        headers=headers,
        json={"status": "CONTACTED", "need": "Đã gọi, hẹn tuần sau"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "CONTACTED"


# --- Hồ sơ HLV ---------------------------------------------------------------


def test_trainer_can_edit_own_profile(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = Trainer(full_name="HLV Demo 01", user_id=user.id)
    db.add(trainer)
    db.commit()

    response = client.patch(
        f"/trainers/{trainer.id}",
        headers=_headers(client, user),
        json={"bio": "Dạy Pilates cho người mới bắt đầu."},
    )
    assert response.status_code == 200


def test_trainer_cannot_read_or_edit_another_trainer(
    client: TestClient, db: Session
) -> None:
    """Gọi thẳng API bằng id người khác phải bị từ chối.

    Trả **404** chứ không phải 403, và trả đúng 404 đó cho cả id không tồn tại:
    hai mã khác nhau cho hai trường hợp là một bộ đếm số HLV của studio.
    """
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    mine = Trainer(full_name="HLV Demo 01", user_id=user.id)
    theirs = Trainer(full_name="HLV Demo 02")
    db.add_all([mine, theirs])
    db.commit()
    headers = _headers(client, user)

    assert client.get(f"/trainers/{theirs.id}", headers=headers).status_code == 404
    assert (
        client.patch(
            f"/trainers/{theirs.id}", headers=headers, json={"bio": "Sửa trộm"}
        ).status_code
        == 404
    )
    # Id không tồn tại cho cùng một câu trả lời — không phân biệt được.
    assert client.get("/trainers/999999", headers=headers).status_code == 404

    # Hồ sơ của chính mình thì vẫn mở được bình thường.
    assert client.get(f"/trainers/{mine.id}", headers=headers).status_code == 200


def test_trainer_cannot_publish_themselves(client: TestClient, db: Session) -> None:
    """HLV sửa được phần giới thiệu của mình nhưng không tự đưa mình lên trang."""
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = Trainer(full_name="HLV Demo 01", user_id=user.id, is_public=False)
    db.add(trainer)
    db.commit()

    response = client.patch(
        f"/trainers/{trainer.id}",
        headers=_headers(client, user),
        json={"is_public": True, "bio": "Giới thiệu."},
    )
    assert response.status_code == 200
    assert response.json()["is_public"] is False


def test_trainer_cannot_reactivate_themselves(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    trainer = Trainer(full_name="HLV Demo 01", user_id=user.id, is_active=False)
    db.add(trainer)
    db.commit()

    response = client.patch(
        f"/trainers/{trainer.id}",
        headers=_headers(client, user),
        json={"is_active": True},
    )
    assert response.json()["is_active"] is False


def test_trainer_list_requires_staff(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    assert client.get("/trainers", headers=_headers(client, user)).status_code == 403


def test_is_public_controls_appearance_on_the_public_page(
    client: TestClient, db: Session
) -> None:
    staff = make_user(db, Role.STAFF)
    headers = _headers(client, staff)
    trainer_id = client.post(
        "/trainers",
        headers=headers,
        json={"full_name": "HLV Demo 01", "bio": "Dạy Pilates.", "is_public": False},
    ).json()["id"]

    assert client.get("/public/trainers").json() == []

    client.patch(f"/trainers/{trainer_id}", headers=headers, json={"is_public": True})
    assert len(client.get("/public/trainers").json()) == 1


# --- Lỗ hổng phát hiện khi review M2 -----------------------------------------


def test_lead_phone_cannot_carry_a_payload(client: TestClient, db: Session) -> None:
    """`phone` ngắn nhưng vẫn đủ chỗ cho `<svg onload=...>`.

    Đây là cùng một đường XSS lưu trữ mà `need` đã được gác, chỉ khác cột:
    khách ẩn danh gửi → nhân viên mở danh sách lead.
    """
    response = client.post(
        "/public/leads",
        json={"full_name": "Khách Demo 01", "phone": "<svg onload=alert(1)>"},
    )
    assert response.status_code == 422
    assert _lead_count(db) == 0


def test_lead_phone_is_normalised_before_dedup(client: TestClient, db: Session) -> None:
    """`0900 000 055` và `0900000055` là cùng một người.

    Không chuẩn hoá thì một dấu cách đủ để vòng qua phép chặn trùng.
    """
    client.post("/public/leads", json={"full_name": "Khách Demo 01", "phone": "0900 000 055"})
    client.post("/public/leads", json={"full_name": "Khách Demo 01", "phone": "0900000055"})
    assert _lead_count(db) == 1


def test_existing_student_resubmitting_the_form_creates_no_lead(
    client: TestClient, db: Session
) -> None:
    """Người đã là học viên gửi lại form không được thành "khách mới"."""
    from app.models.people import Student

    db.add(Student(full_name="Học viên Demo 01", phone="0900000055"))
    db.commit()

    client.post("/public/leads", json={"full_name": "Học viên Demo 01", "phone": "0900000055"})
    assert _lead_count(db) == 0


def test_assigning_lead_to_unknown_user_returns_422_not_500(
    client: TestClient, db: Session
) -> None:
    """Id không tồn tại là đầu vào sai — đáng 422, không phải ForeignKeyViolation."""
    staff = make_user(db, Role.STAFF)
    headers = _headers(client, staff)
    client.post("/public/leads", json={"full_name": "Khách Demo 01", "phone": "0900000055"})
    lead_id = client.get("/leads", headers=headers).json()[0]["id"]

    response = client.patch(
        f"/leads/{lead_id}", headers=headers, json={"assigned_to": 999999}
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_ASSIGNEE"


def test_lead_cannot_be_assigned_to_a_student_account(
    client: TestClient, db: Session
) -> None:
    staff = make_user(db, Role.STAFF)
    student_user = make_user(db, Role.STUDENT, email="hv1@example.com")
    headers = _headers(client, staff)
    client.post("/public/leads", json={"full_name": "Khách Demo 01", "phone": "0900000055"})
    lead_id = client.get("/leads", headers=headers).json()[0]["id"]

    response = client.patch(
        f"/leads/{lead_id}", headers=headers, json={"assigned_to": student_user.id}
    )
    assert response.status_code == 422


def test_lead_status_cannot_be_set_to_converted_by_hand(
    client: TestClient, db: Session
) -> None:
    """`CONVERTED` chỉ được đặt cùng lúc với `converted_student_id`.

    Cho đặt tay thì bản ghi nói rằng đã có học viên trong khi không có ai.
    """
    staff = make_user(db, Role.STAFF)
    headers = _headers(client, staff)
    client.post("/public/leads", json={"full_name": "Khách Demo 01", "phone": "0900000055"})
    lead_id = client.get("/leads", headers=headers).json()[0]["id"]

    response = client.patch(
        f"/leads/{lead_id}", headers=headers, json={"status": "CONVERTED"}
    )
    assert response.status_code == 422


def test_package_without_price_shows_empty_not_zero(client: TestClient, db: Session) -> None:
    """Studio chưa cung cấp giá → `null`, không phải `0`.

    `0` là một con số, và nó nói sai. Với `price` NOT NULL, nhân viên không có
    cách nào diễn đạt "chưa có giá" và trạng thái rỗng trở thành bất khả.
    """
    from decimal import Decimal

    from app.domain.rules import ClassType
    from app.models.money import PackageType

    db.add(
        PackageType(
            name="Gói chưa có giá",
            price=None,
            credits=10,
            duration_days=90,
            class_type=ClassType.GROUP,
        )
    )
    db.add(
        PackageType(
            name="Gói có giá",
            price=Decimal("2500000.00"),
            credits=10,
            duration_days=90,
            class_type=ClassType.PRIVATE,
        )
    )
    db.commit()

    body = {row["name"]: row["price"] for row in client.get("/public/packages").json()}
    assert body["Gói chưa có giá"] is None
    assert body["Gói có giá"] == "2500000.00"
