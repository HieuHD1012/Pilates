"""Lớp và lịch học qua API (F06), gồm lần chạy hai của F02/F04."""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import TIMEZONE, ClassType, Role, SessionStatus, now
from app.models.people import Trainer
from tests.conftest import auth_header, login, make_user


def _headers(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


def _iso(moment) -> str:
    return moment.isoformat()


@pytest.fixture
def setup(client: TestClient, db: Session) -> dict:
    admin = make_user(db, Role.ADMIN)
    staff = make_user(db, Role.STAFF)
    trainer_user = make_user(db, Role.TRAINER, email="hlv1@example.com")
    other_trainer_user = make_user(db, Role.TRAINER, email="hlv2@example.com")

    trainer = Trainer(full_name="HLV Demo 01", user_id=trainer_user.id, is_public=True)
    other = Trainer(full_name="HLV Demo 02", user_id=other_trainer_user.id)
    db.add_all([trainer, other])
    db.commit()

    return {
        "admin": admin,
        "staff": staff,
        "trainer": trainer,
        "other_trainer": other,
        "trainer_user": trainer_user,
        "other_trainer_user": other_trainer_user,
        "staff_headers": _headers(client, staff),
    }


def _create(client: TestClient, setup: dict, *, hours: int = 24, **overrides) -> dict:
    starts = now() + timedelta(hours=hours)
    payload = {
        "starts_at": _iso(starts),
        "ends_at": _iso(starts + timedelta(hours=1)),
        "trainer_id": setup["trainer"].id,
        "class_type": "GROUP",
        "capacity": 6,
    }
    payload.update(overrides)
    return client.post("/classes", headers=setup["staff_headers"], json=payload)


# --- Tạo lớp -----------------------------------------------------------------


def test_staff_can_create_a_class(client: TestClient, setup: dict) -> None:
    response = _create(client, setup)
    assert response.status_code == 201
    assert response.json()["capacity"] == 6
    assert response.json()["status"] == "SCHEDULED"


def test_overlapping_class_returns_409_not_500(client: TestClient, setup: dict) -> None:
    """Vi phạm chống trùng giờ là lỗi nghiệp vụ, không phải sự cố hệ thống."""
    first = _create(client, setup).json()
    second = client.post(
        "/classes",
        headers=setup["staff_headers"],
        json={
            "starts_at": first["starts_at"],
            "ends_at": first["ends_at"],
            "trainer_id": setup["trainer"].id,
            "class_type": "GROUP",
            "capacity": 6,
        },
    )
    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "TRAINER_DOUBLE_BOOKED"


def test_adjacent_classes_are_allowed(client: TestClient, setup: dict) -> None:
    """Lớp nối đuôi nhau không phải là chồng giờ."""
    first = _create(client, setup).json()
    second = client.post(
        "/classes",
        headers=setup["staff_headers"],
        json={
            "starts_at": first["ends_at"],
            "ends_at": _iso(now() + timedelta(hours=26)),
            "trainer_id": setup["trainer"].id,
            "class_type": "GROUP",
            "capacity": 6,
        },
    )
    assert second.status_code == 201


def test_group_class_requires_explicit_capacity(client: TestClient, setup: dict) -> None:
    """**Không hardcode con số nào** — sức chứa Group do nhân viên đặt."""
    response = _create(client, setup, capacity=None)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "CAPACITY_REQUIRED"


def test_private_class_defaults_to_one_seat(client: TestClient, setup: dict) -> None:
    response = _create(client, setup, class_type="PRIVATE", capacity=None)
    assert response.status_code == 201
    assert response.json()["capacity"] == 1


def test_duo_is_a_private_class_with_two_seats(client: TestClient, setup: dict) -> None:
    response = _create(client, setup, class_type="PRIVATE", capacity=2)
    assert response.status_code == 201
    assert response.json()["capacity"] == 2


def test_private_class_cannot_take_three(client: TestClient, setup: dict) -> None:
    """Lớp Private không nhận 3 người — và con số 3 không có chỗ nào trong hệ."""
    response = _create(client, setup, class_type="PRIVATE", capacity=3)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INVALID_PRIVATE_CAPACITY"


def test_end_before_start_is_rejected(client: TestClient, setup: dict) -> None:
    starts = now() + timedelta(days=1)
    response = client.post(
        "/classes",
        headers=setup["staff_headers"],
        json={
            "starts_at": _iso(starts),
            "ends_at": _iso(starts - timedelta(hours=1)),
            "trainer_id": setup["trainer"].id,
            "class_type": "GROUP",
            "capacity": 6,
        },
    )
    assert response.status_code == 409


def test_inactive_trainer_cannot_be_assigned(
    client: TestClient, db: Session, setup: dict
) -> None:
    setup["trainer"].is_active = False
    db.commit()
    response = _create(client, setup)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "TRAINER_INACTIVE"


# --- Đổi HLV -----------------------------------------------------------------


def test_changing_trainer_checks_for_conflicts(client: TestClient, setup: dict) -> None:
    first = _create(client, setup).json()
    second = client.post(
        "/classes",
        headers=setup["staff_headers"],
        json={
            "starts_at": first["starts_at"],
            "ends_at": first["ends_at"],
            "trainer_id": setup["other_trainer"].id,
            "class_type": "GROUP",
            "capacity": 6,
        },
    ).json()

    response = client.post(
        f"/classes/{second['id']}/trainer",
        headers=setup["staff_headers"],
        json={"trainer_id": setup["trainer"].id},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "TRAINER_DOUBLE_BOOKED"


def test_changing_trainer_to_a_free_slot_succeeds(client: TestClient, setup: dict) -> None:
    session = _create(client, setup).json()
    response = client.post(
        f"/classes/{session['id']}/trainer",
        headers=setup["staff_headers"],
        json={"trainer_id": setup["other_trainer"].id},
    )
    assert response.status_code == 200
    assert response.json()["trainer_id"] == setup["other_trainer"].id


# --- Phân quyền --------------------------------------------------------------


def test_trainer_sees_only_own_classes(client: TestClient, setup: dict) -> None:
    """`scope_class_sessions` ghim phạm vi vào câu truy vấn."""
    mine = _create(client, setup).json()
    _create(client, setup, hours=48, trainer_id=setup["other_trainer"].id)

    body = client.get(
        "/classes", headers=_headers(client, setup["trainer_user"])
    ).json()
    assert [item["id"] for item in body] == [mine["id"]]


def test_trainer_cannot_open_another_trainers_class(
    client: TestClient, setup: dict
) -> None:
    theirs = _create(client, setup, trainer_id=setup["other_trainer"].id).json()
    response = client.get(
        f"/classes/{theirs['id']}", headers=_headers(client, setup["trainer_user"])
    )
    assert response.status_code == 403


def test_trainer_cannot_create_classes(client: TestClient, setup: dict) -> None:
    starts = now() + timedelta(days=1)
    response = client.post(
        "/classes",
        headers=_headers(client, setup["trainer_user"]),
        json={
            "starts_at": _iso(starts),
            "ends_at": _iso(starts + timedelta(hours=1)),
            "trainer_id": setup["trainer"].id,
            "class_type": "GROUP",
            "capacity": 6,
        },
    )
    assert response.status_code == 403


def test_my_schedule_is_pinned_to_the_logged_in_trainer(
    client: TestClient, setup: dict
) -> None:
    """Không nhận `trainer_id` từ tham số, nên không có gì để giả mạo."""
    mine = _create(client, setup).json()
    _create(client, setup, hours=48, trainer_id=setup["other_trainer"].id)

    body = client.get(
        "/classes/my-schedule", headers=_headers(client, setup["trainer_user"])
    ).json()
    assert [item["id"] for item in body] == [mine["id"]]


def test_my_schedule_is_trainers_only(client: TestClient, db: Session, setup: dict) -> None:
    student = make_user(db, Role.STUDENT, email="hv1@example.com")
    response = client.get("/classes/my-schedule", headers=_headers(client, student))
    assert response.status_code == 403


# --- Thống kê tháng (F04, khép lại ở cửa sổ F06) -----------------------------


def test_trainer_monthly_stats_count_from_class_sessions(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Số lớp đếm đúng, theo đúng HLV, theo đúng tháng giờ studio.

    Cùng nguồn với báo cáo HLV ở F09, nên hai màn hình không thể lệch nhau.
    Dựng buổi ở một tháng cố định thay vì "vài ngày tới": khoảng trôi nổi buộc
    test phải nới assert tới mức không còn kiểm được gì.
    """
    from datetime import datetime

    from app.models.scheduling import ClassSession

    def add_session(day: int, hour: int, trainer_id: int, cancelled: bool = False) -> None:
        starts = datetime(2027, 3, day, hour, 0, tzinfo=TIMEZONE)
        session = ClassSession(
            starts_at=starts,
            ends_at=starts + timedelta(hours=1),
            trainer_id=trainer_id,
            class_type=ClassType.GROUP,
            capacity=6,
            created_by=setup["admin"].id,
        )
        db.add(session)
        db.flush()
        if cancelled:
            session.status = SessionStatus.CANCELLED

    mine = setup["trainer"].id
    theirs = setup["other_trainer"].id
    add_session(3, 18, mine)
    add_session(10, 18, mine)
    add_session(17, 18, mine, cancelled=True)
    # Nhiễu: HLV khác trong cùng tháng, và chính HLV này ở tháng liền kề.
    add_session(5, 18, theirs)
    starts = datetime(2027, 4, 2, 18, 0, tzinfo=TIMEZONE)
    db.add(
        ClassSession(
            starts_at=starts,
            ends_at=starts + timedelta(hours=1),
            trainer_id=mine,
            class_type=ClassType.GROUP,
            capacity=6,
            created_by=setup["admin"].id,
        )
    )
    db.commit()

    body = client.get(
        "/classes/trainer-stats",
        headers=setup["staff_headers"],
        params={"trainer_id": mine, "year": 2027, "month": 3},
    ).json()

    assert body["scheduled_sessions"] == 2
    assert body["cancelled_sessions"] == 1
    assert body["total_bookings"] == 0


def test_trainer_monthly_stats_respect_the_studio_month_boundary(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Buổi 06:00 ngày 1 thuộc tháng đó, không phải tháng trước.

    Lấy biên tháng theo giờ container (UTC) thì 06:00 ngày 1 giờ Việt Nam là
    23:00 ngày cuối tháng trước, và con số nhảy sang kỳ khác.
    """
    from datetime import datetime

    from app.models.scheduling import ClassSession

    starts = datetime(2027, 3, 1, 6, 0, tzinfo=TIMEZONE)
    db.add(
        ClassSession(
            starts_at=starts,
            ends_at=starts + timedelta(hours=1),
            trainer_id=setup["trainer"].id,
            class_type=ClassType.GROUP,
            capacity=6,
            created_by=setup["admin"].id,
        )
    )
    db.commit()

    march = client.get(
        "/classes/trainer-stats",
        headers=setup["staff_headers"],
        params={"trainer_id": setup["trainer"].id, "year": 2027, "month": 3},
    ).json()
    february = client.get(
        "/classes/trainer-stats",
        headers=setup["staff_headers"],
        params={"trainer_id": setup["trainer"].id, "year": 2027, "month": 2},
    ).json()

    assert march["scheduled_sessions"] == 1
    assert february["scheduled_sessions"] == 0


def test_trainer_stats_requires_staff(client: TestClient, setup: dict) -> None:
    response = client.get(
        "/classes/trainer-stats",
        headers=_headers(client, setup["trainer_user"]),
        params={"trainer_id": setup["trainer"].id, "year": 2026, "month": 10},
    )
    assert response.status_code == 403


# --- Lịch lớp công khai (F02, khép lại ở cửa sổ F06) -------------------------


def test_public_schedule_shows_only_a_boolean_for_fullness(
    client: TestClient, setup: dict
) -> None:
    """`is_full` là boolean, không phải số chỗ còn lại.

    Số chỗ đủ để suy ra lớp nào vắng, và "lớp 6h sáng thứ Ba chỉ có 1 người" là
    thông tin không nên công khai ở một studio nhỏ.
    """
    _create(client, setup)
    body = client.get("/public/schedule").json()

    assert len(body) == 1
    assert set(body[0]) == {
        "starts_at",
        "ends_at",
        "class_type",
        "trainer_name",
        "is_full",
    }
    assert body[0]["is_full"] is False


def test_public_schedule_hides_cancelled_classes(client: TestClient, setup: dict) -> None:
    session = _create(client, setup).json()
    client.post(
        f"/classes/{session['id']}/cancel",
        headers=setup["staff_headers"],
        json={"reason": "HLV nghỉ ốm."},
    )
    assert client.get("/public/schedule").json() == []


def test_public_schedule_hides_past_classes(client: TestClient, db: Session, setup: dict) -> None:
    from app.models.scheduling import ClassSession

    session_id = _create(client, setup).json()["id"]
    stored = db.get(ClassSession, session_id)
    stored.starts_at = now() - timedelta(hours=3)
    stored.ends_at = now() - timedelta(hours=2)
    db.commit()

    assert client.get("/public/schedule").json() == []


def test_public_schedule_needs_no_authentication(client: TestClient, setup: dict) -> None:
    assert client.get("/public/schedule").status_code == 200


# --- Lịch lặp lại ------------------------------------------------------------


def test_recurrence_preview_then_create(client: TestClient, setup: dict) -> None:
    from datetime import timedelta as td

    from app.domain.rules import today

    start_day = today() + td(days=7)
    start_day += td(days=(0 - start_day.weekday()) % 7)
    payload = {
        "start_date": start_day.isoformat(),
        "end_date": (start_day + td(days=21)).isoformat(),
        "weekdays": [0],
        "start_time": "18:00:00",
        "duration_minutes": 60,
        "trainer_id": setup["trainer"].id,
        "class_type": "GROUP",
        "capacity": 6,
    }

    preview = client.post(
        "/classes/recurrence/preview", headers=setup["staff_headers"], json=payload
    ).json()
    assert preview["available_count"] == 4
    assert preview["conflict_count"] == 0

    created = client.post(
        "/classes/recurrence", headers=setup["staff_headers"], json=payload
    )
    assert created.status_code == 201
    body = created.json()
    assert len(body["sessions"]) == 4
    assert len({item["recurrence_id"] for item in body["sessions"]}) == 1


def test_recurrence_rejects_an_unbounded_range(client: TestClient, setup: dict) -> None:
    from datetime import timedelta as td

    from app.domain.rules import today

    response = client.post(
        "/classes/recurrence/preview",
        headers=setup["staff_headers"],
        json={
            "start_date": today().isoformat(),
            "end_date": (today() + td(days=3650)).isoformat(),
            "weekdays": [0, 1, 2, 3, 4],
            "start_time": "18:00:00",
            "duration_minutes": 60,
            "trainer_id": setup["trainer"].id,
            "class_type": "GROUP",
            "capacity": 6,
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "TOO_MANY_OCCURRENCES"


# --- Hủy lớp -----------------------------------------------------------------


def test_cancelling_requires_a_reason(
    client: TestClient, db: Session, setup: dict
) -> None:
    """Chặn ở cả hai tầng — xem giải thích ở `test_void_requires_a_reason`."""
    session = _create(client, setup).json()
    response = client.post(
        f"/classes/{session['id']}/cancel",
        headers=setup["staff_headers"],
        json={"reason": "  "},
    )
    assert response.status_code == 422

    from app.core.errors import BusinessError
    from app.services import scheduling

    try:
        scheduling.cancel_session(
            db, session_id=session["id"], actor_user_id=setup["admin"].id, reason="  "
        )
        raise AssertionError("Service phải từ chối lý do rỗng")
    except BusinessError as exc:
        assert exc.code == "CANCEL_NEEDS_REASON"


def test_cancelling_twice_is_rejected(client: TestClient, setup: dict) -> None:
    session = _create(client, setup).json()
    path = f"/classes/{session['id']}/cancel"
    body = {"reason": "HLV nghỉ ốm."}

    assert client.post(path, headers=setup["staff_headers"], json=body).status_code == 200
    second = client.post(path, headers=setup["staff_headers"], json=body)
    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "SESSION_ALREADY_CANCELLED"


def test_session_detail_reports_seats(client: TestClient, setup: dict) -> None:
    session = _create(client, setup).json()
    body = client.get(
        f"/classes/{session['id']}", headers=setup["staff_headers"]
    ).json()

    assert body["booked_count"] == 0
    assert body["seats_left"] == 6
    assert body["trainer_name"] == "HLV Demo 01"
