"""Điểm danh sau lớp: quyền HLV, biên giờ, audit, ledger và thao tác đồng thời."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.domain.rules import TIMEZONE, BookingStatus, Role, now
from app.models.money import CreditLedger, StudentPackage
from app.models.scheduling import Booking
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import auth_header, login, make_user, studio_clock
from tests.factories import give_package, make_session, make_student_account, make_trainer


def _stage(db, client):
    admin = make_user(db, Role.ADMIN)
    trainer_user = make_user(db, Role.TRAINER)
    trainer = make_trainer(db, user=trainer_user)
    student, student_user = make_student_account(db)
    package = give_package(db, student, admin.id)
    session = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    headers = {
        role: auth_header(login(client, user.email)["access_token"])
        for role, user in [
            (Role.ADMIN, admin),
            (Role.TRAINER, trainer_user),
            (Role.STUDENT, student_user),
        ]
    }
    response = client.post(
        "/bookings", headers=headers[Role.STUDENT], json={"class_session_id": session.id}
    )
    assert response.status_code == 201, response.text
    assert_ledger_is_sound(db)
    return {
        "headers": headers,
        "booking_id": response.json()["booking"]["id"],
        "session": session,
        "package": package,
        "trainer_user": trainer_user,
        "student": student,
    }


@pytest.fixture
def stage(db, client):
    return _stage(db, client)


def _finish(monkeypatch, stage):
    clock = studio_clock(stage["session"].ends_at + timedelta(seconds=1))
    monkeypatch.setattr("app.services.attendance.now", clock)
    return clock()


def _mark(client, stage, status="ATTENDED", headers=None):
    return client.patch(
        f"/bookings/{stage['booking_id']}/attendance",
        json={"status": status},
        headers=stage["headers"][Role.TRAINER] if headers is None else headers,
    )


def test_attendance_correction_preserves_credits_and_audits(client, db, stage, monkeypatch):
    at = _finish(monkeypatch, stage)
    before = db.scalar(select(func.count()).select_from(CreditLedger))
    marked = _mark(client, stage)
    assert marked.status_code == 200, marked.text
    assert marked.json()["status"] == "ATTENDED"
    assert marked.json()["attendance_marked_by"] == stage["trainer_user"].id
    assert marked.json()["attendance_marked_at"] is not None
    assert _mark(client, stage).json() == marked.json()
    monkeypatch.setattr("app.services.attendance.now", studio_clock(at + timedelta(minutes=1)))
    corrected = _mark(client, stage, "NO_SHOW")
    assert corrected.status_code == 200, corrected.text
    assert corrected.json()["attendance_marked_at"] != marked.json()["attendance_marked_at"]
    assert corrected.json()["status"] == "NO_SHOW"
    db.expire_all()
    assert db.get(StudentPackage, stage["package"].id).balance_cached == 9
    assert db.scalar(select(func.count()).select_from(CreditLedger)) == before
    assert_ledger_is_sound(db)
    schedule = client.get("/my-schedule", headers=stage["headers"][Role.STUDENT]).json()
    assert schedule[0]["booking_status"] == "NO_SHOW"
    assert schedule[0]["can_cancel"] is False
    assert schedule[0]["refund_if_cancelled_now"] is False
    detail = client.get(f"/classes/{stage['session'].id}", headers=stage["headers"][Role.ADMIN])
    assert detail.json()["booked_count"] == 1
    report = client.get(
        "/reports/classes",
        headers=stage["headers"][Role.ADMIN],
        # Ngày cuối kỳ là ngày **theo giờ studio**: `.date()` của một timestamp
        # đọc về từ PostgreSQL là ngày theo UTC, lệch một ngày trong khung
        # 00:00–07:00 giờ Việt Nam và làm buổi lớp rơi ra ngoài kỳ báo cáo.
        params={
            "period_end": stage["session"].ends_at.astimezone(TIMEZONE).date().isoformat()
        },
    ).json()
    assert report["total_bookings"] == 1
    assert (
        client.get(
            f"/students/{stage['student'].id}/progress-photos",
            headers=stage["headers"][Role.TRAINER],
        ).status_code
        == 200
    )


@pytest.mark.parametrize("offset,expected", [(-3600, 409), (-1, 409), (0, 200), (1, 200)])
def test_attendance_waits_until_end_of_class(client, stage, monkeypatch, offset, expected):
    at = stage["session"].ends_at + timedelta(seconds=offset)
    monkeypatch.setattr("app.services.attendance.now", studio_clock(at))
    response = _mark(client, stage)
    assert response.status_code == expected, response.text
    if expected == 409:
        assert response.json()["detail"]["code"] == "SESSION_NOT_FINISHED"


@pytest.mark.parametrize(
    "role",
    [
        Role.ADMIN,
        Role.STAFF,
        Role.STUDENT,
        None,
        "other_trainer",
        "unlinked_trainer",
    ],
)
def test_attendance_rejects_other_people(client, db, stage, monkeypatch, role):
    _finish(monkeypatch, stage)
    headers = {}
    if role in stage["headers"]:
        headers = stage["headers"][role]
    elif role:
        user = make_user(
            db,
            Role.TRAINER if role in ("other_trainer", "unlinked_trainer") else role,
            email="other@example.com",
        )
        if role == "other_trainer":
            make_trainer(db, user=user)
        headers = auth_header(login(client, user.email)["access_token"])
    response = _mark(client, stage, headers=headers)
    assert response.status_code == (403 if role else 401), response.text
    roster = client.get(f"/classes/{stage['session'].id}/attendance", headers=headers)
    assert roster.status_code == (403 if role else 401), roster.text
    db.expire_all()
    assert db.get(Booking, stage["booking_id"]).status == BookingStatus.BOOKED


def test_roster_exposes_names_and_attendance_without_payment_data(client, stage):
    response = client.get(
        f"/classes/{stage['session'].id}/attendance", headers=stage["headers"][Role.TRAINER]
    )
    assert response.status_code == 200, response.text
    assert len(response.json()) == 1
    row = response.json()[0]
    assert row["student_name"] == stage["student"].full_name
    assert set(row) == {
        "id",
        "class_session_id",
        "student_id",
        "student_name",
        "status",
        "attendance_marked_by",
        "attendance_marked_at",
    }


@pytest.mark.parametrize("cancel_class", [False, True])
def test_cannot_mark_cancelled_booking_or_class(client, db, stage, monkeypatch, cancel_class):
    if cancel_class:
        response = client.post(
            f"/classes/{stage['session'].id}/cancel",
            headers=stage["headers"][Role.ADMIN],
            json={"reason": "Studio nghỉ đột xuất"},
        )
    else:
        response = client.post(
            f"/bookings/{stage['booking_id']}/cancel", headers=stage["headers"][Role.STUDENT]
        )
    assert response.status_code == 200, response.text
    _finish(monkeypatch, stage)
    response = _mark(client, stage)
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == (
        "SESSION_CANCELLED" if cancel_class else "BOOKING_NOT_ACTIVE"
    )
    assert (
        client.get(
            f"/classes/{stage['session'].id}/attendance", headers=stage["headers"][Role.TRAINER]
        ).json()
        == []
    )
    assert_ledger_is_sound(db)


@pytest.mark.parametrize("status", ["BOOKED", "CANCELLED_INTIME", "unknown", None])
def test_invalid_attendance_status_is_rejected(client, stage, monkeypatch, status):
    _finish(monkeypatch, stage)
    assert _mark(client, stage, status).status_code == 422


def test_marked_booking_and_class_cannot_be_cancelled_or_reassigned(client, db, stage, monkeypatch):
    _finish(monkeypatch, stage)
    assert _mark(client, stage).status_code == 200
    for path, payload in [
        (f"/classes/{stage['session'].id}/cancel", {"reason": "Hủy nhầm lớp"}),
        (f"/classes/{stage['session'].id}/trainer", {"trainer_id": stage["session"].trainer_id}),
    ]:
        response = client.post(path, headers=stage["headers"][Role.ADMIN], json=payload)
        assert response.status_code == 409, response.text
        assert response.json()["detail"]["code"] == "SESSION_HAS_ATTENDANCE"
    response = client.post(
        f"/bookings/{stage['booking_id']}/cancel", headers=stage["headers"][Role.STUDENT]
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "BOOKING_NOT_ACTIVE"
    assert_ledger_is_sound(db)


def test_database_disallows_second_booking_after_attendance(client, db, stage, monkeypatch):
    _finish(monkeypatch, stage)
    assert _mark(client, stage).status_code == 200
    with pytest.raises(IntegrityError):
        db.add(
            Booking(
                class_session_id=stage["session"].id,
                student_id=stage["student"].id,
                student_package_id=stage["package"].id,
                booked_by_user_id=stage["trainer_user"].id,
            )
        )
        db.commit()
    db.rollback()
    assert_ledger_is_sound(db)


def test_parallel_attendance_is_idempotent(concurrent_client, db, monkeypatch):
    stage = _stage(db, concurrent_client)
    _finish(monkeypatch, stage)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(_mark, concurrent_client, stage) for _ in range(2)]
        responses = [future.result(timeout=15) for future in futures]
    assert [r.status_code for r in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    assert_ledger_is_sound(db)


def test_attendance_racing_class_cancellation_has_one_winner(concurrent_client, db, monkeypatch):
    stage = _stage(db, concurrent_client)
    _finish(monkeypatch, stage)
    with ThreadPoolExecutor(max_workers=2) as pool:
        mark = pool.submit(_mark, concurrent_client, stage)
        cancel = pool.submit(
            concurrent_client.post,
            f"/classes/{stage['session'].id}/cancel",
            headers=stage["headers"][Role.ADMIN],
            json={"reason": "Studio hủy lớp"},
        )
        responses = [mark.result(timeout=15), cancel.result(timeout=15)]
    assert sorted(r.status_code for r in responses) == [200, 409]
    db.expire_all()
    booking = db.get(Booking, stage["booking_id"])
    assert booking.status in (BookingStatus.ATTENDED, BookingStatus.CANCELLED_INTIME)
    assert_ledger_is_sound(db)
