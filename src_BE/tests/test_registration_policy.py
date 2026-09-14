"""Nghiệp vụ đã chốt: hạn gói tại ngày học, khóa hủy và chỉ học viên đăng ký."""

from datetime import UTC, timedelta

import pytest
from sqlalchemy import func, select

from app.domain.rules import CANCEL_CUTOFF, BookingStatus, ClassType, Role, now
from app.models.money import CreditLedger
from app.models.scheduling import Booking
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import auth_header, login, make_user, studio_clock
from tests.factories import give_package, make_session, make_student_account, make_trainer


@pytest.fixture
def policy(db, client):
    admin = make_user(db, Role.ADMIN)
    student, user = make_student_account(db)
    trainer = make_trainer(db)
    return {
        "admin": admin,
        "student": student,
        "user": user,
        "trainer": trainer,
        "headers": auth_header(login(client, user.email)["access_token"]),
    }


@pytest.mark.parametrize("explicit", [False, True])
def test_package_must_be_valid_on_session_date(db, client, policy, explicit):
    package = give_package(db, policy["student"], policy["admin"].id, end_offset_days=2)
    session = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(days=3)
    )
    payload = {"class_session_id": session.id}
    if explicit:
        payload["student_package_id"] = package.id
    response = client.post("/bookings", headers=policy["headers"], json=payload)
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "PACKAGE_NOT_VALID_FOR_SESSION"
    assert session.id not in client.get("/my-schedule/bookable", headers=policy["headers"]).json()
    assert db.scalar(select(func.count()).select_from(Booking)) == 0
    assert_ledger_is_sound(db)


def test_auto_selects_first_package_still_valid_on_day_of_class(db, client, policy):
    early = give_package(db, policy["student"], policy["admin"].id, end_offset_days=2)
    late = give_package(db, policy["student"], policy["admin"].id, end_offset_days=6)
    session = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(days=3)
    )
    response = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": session.id}
    )
    assert response.status_code == 201, response.text
    assert response.json()["student_package_id"] == late.id
    db.expire_all()
    assert early.balance_cached == 10
    assert late.balance_cached == 9
    assert_ledger_is_sound(db)


@pytest.mark.parametrize("class_type", [ClassType.GROUP, ClassType.PRIVATE])
def test_booking_on_last_valid_day_is_allowed(db, client, policy, class_type):
    give_package(
        db, policy["student"], policy["admin"].id, class_type=class_type, end_offset_days=2
    )
    session = make_session(
        db,
        policy["trainer"],
        policy["admin"].id,
        starts_at=now() + timedelta(days=2),
        class_type=class_type,
    )
    response = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": session.id}
    )
    assert response.status_code == 201, response.text
    assert response.json()["credits_remaining"] == 9
    assert_ledger_is_sound(db)


@pytest.mark.parametrize("class_type", [ClassType.GROUP, ClassType.PRIVATE])
@pytest.mark.parametrize("offset", [-1, 0, 1])
def test_cancellation_boundary_refunds_or_locks(
    db, client, policy, monkeypatch, class_type, offset
):
    give_package(db, policy["student"], policy["admin"].id, class_type=class_type)
    session = make_session(
        db,
        policy["trainer"],
        policy["admin"].id,
        starts_at=now() + timedelta(days=1),
        class_type=class_type,
    )
    booking = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": session.id}
    ).json()["booking"]
    clock = studio_clock(session.starts_at - CANCEL_CUTOFF[class_type] + timedelta(seconds=offset))
    monkeypatch.setattr("app.services.booking_service.now", clock)
    monkeypatch.setattr("app.api.my_schedule.now", clock)
    row = client.get("/my-schedule", headers=policy["headers"]).json()[0]
    assert row["can_cancel"] is (offset <= 0)
    assert row["refund_if_cancelled_now"] is (offset <= 0)
    before = db.scalar(select(func.count()).select_from(CreditLedger))
    response = client.post(f"/bookings/{booking['id']}/cancel", headers=policy["headers"])
    if offset <= 0:
        assert response.status_code == 200, response.text
        assert response.json()["refunded"] is True
        assert response.json()["credits_remaining"] == 10
    else:
        assert response.status_code == 409, response.text
        assert response.json()["detail"]["code"] == "CANCELLATION_CLOSED"
        db.expire_all()
        assert db.get(Booking, booking["id"]).status is BookingStatus.BOOKED
        assert db.scalar(select(func.count()).select_from(CreditLedger)) == before
    assert_ledger_is_sound(db)


@pytest.mark.parametrize("role", [Role.ADMIN, Role.STAFF, Role.TRAINER])
def test_staff_cannot_register_cancel_or_change_for_student(db, client, policy, role):
    give_package(db, policy["student"], policy["admin"].id)
    session = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(days=1)
    )
    target = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(days=2)
    )
    booking = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": session.id}
    ).json()["booking"]
    user = policy["admin"] if role is Role.ADMIN else make_user(db, role)
    headers = auth_header(login(client, user.email)["access_token"])
    for path, payload in [
        ("/bookings", {"class_session_id": target.id, "student_id": policy["student"].id}),
        (f"/bookings/{booking['id']}/cancel", {}),
        (f"/bookings/{booking['id']}/change", {"new_class_session_id": target.id}),
    ]:
        response = client.post(path, headers=headers, json=payload)
        assert response.status_code == 403, response.text
    assert_ledger_is_sound(db)


def test_change_to_class_after_package_expiry_keeps_original_booking(db, client, policy):
    package = give_package(db, policy["student"], policy["admin"].id, end_offset_days=2)
    old = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(days=1)
    )
    new = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(days=3)
    )
    booking = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": old.id}
    ).json()["booking"]
    before = db.scalar(select(func.count()).select_from(CreditLedger))
    response = client.post(
        f"/bookings/{booking['id']}/change",
        headers=policy["headers"],
        json={"new_class_session_id": new.id},
    )
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "PACKAGE_NOT_VALID_FOR_SESSION"
    db.expire_all()
    assert db.get(Booking, booking["id"]).status is BookingStatus.BOOKED
    assert package.balance_cached == 9
    assert db.scalar(select(func.count()).select_from(CreditLedger)) == before
    assert_ledger_is_sound(db)


def test_expiry_uses_studio_date_even_when_timestamp_is_utc(db, client, policy):
    from datetime import datetime, time

    from app.domain.rules import TIMEZONE, today

    give_package(db, policy["student"], policy["admin"].id, end_offset_days=2)
    # 00:30 on the day after expiry is 17:30 UTC on the last valid day.
    local = datetime.combine(today() + timedelta(days=3), time(0, 30), tzinfo=TIMEZONE)
    session = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=local.astimezone(UTC)
    )
    assert session.id not in client.get("/my-schedule/bookable", headers=policy["headers"]).json()
    response = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": session.id}
    )
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "PACKAGE_NOT_VALID_FOR_SESSION"
    assert_ledger_is_sound(db)


def test_reschedule_route_is_removed_and_old_grace_cannot_bypass_cutoff(db, client, policy):
    from app.domain.rules import CANCEL_CUTOFF

    give_package(db, policy["student"], policy["admin"].id)
    session = make_session(
        db, policy["trainer"], policy["admin"].id, starts_at=now() + timedelta(hours=2)
    )
    admin_headers = auth_header(login(client, policy["admin"].email)["access_token"])
    assert (
        client.post(
            f"/classes/{session.id}/reschedule",
            headers=admin_headers,
            json={
                "starts_at": (now() + timedelta(days=3)).isoformat(),
                "ends_at": (now() + timedelta(days=3, hours=1)).isoformat(),
            },
        ).status_code
        == 404
    )
    response = client.post(
        "/bookings", headers=policy["headers"], json={"class_session_id": session.id}
    )
    assert response.status_code == 201
    booking = db.get(Booking, response.json()["booking"]["id"])
    booking.has_reschedule_grace = True  # Legacy data must not reopen cancellation.
    db.commit()
    row = client.get("/my-schedule", headers=policy["headers"]).json()[0]
    assert row["can_cancel"] is False
    from datetime import datetime

    assert (
        datetime.fromisoformat(row["cancel_deadline"])
        == session.starts_at - CANCEL_CUTOFF[session.class_type]
    )
    assert (
        client.post(f"/bookings/{booking.id}/cancel", headers=policy["headers"]).json()["detail"][
            "code"
        ]
        == "CANCELLATION_CLOSED"
    )
    assert_ledger_is_sound(db)
