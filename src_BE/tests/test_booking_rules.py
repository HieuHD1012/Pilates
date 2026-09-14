"""Quy tắc đăng ký, hủy và đổi lớp.

Điều được kiểm ở đây không phải "gọi API có 200 không" mà là: **mỗi lý do từ
chối phải nói đúng thứ đang thiếu**. Hết buổi, hết hạn, sai loại gói và hết
chỗ là bốn tình huống khác nhau; gộp thành một câu "không đủ điều kiện" thì
nhân viên đứng quầy không biết bán gì cho khách.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ForbiddenError, NotFoundError
from app.domain.rules import BookingStatus, ClassType, LedgerReason, Role, now
from app.models.money import CreditLedger
from app.models.scheduling import Booking
from app.services import booking_service, credit_ledger, scheduling
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import auth_header, login, make_user
from tests.factories import (
    actor_for,
    give_package,
    make_session,
    make_student,
    make_student_account,
    make_trainer,
)


@pytest.fixture
def world(db: Session):
    """Một học viên có gói, một buổi lớp Group ngày mai."""
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, student_user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=10)
    class_session = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    db.commit()
    return {
        "admin": admin,
        "admin_actor": actor_for(db, admin),
        "trainer": trainer,
        "student": student,
        "student_user": student_user,
        "student_actor": actor_for(db, student_user),
        "package": package,
        "session": class_session,
    }


def _deducts(db: Session, booking_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(CreditLedger)
            .where(
                CreditLedger.booking_id == booking_id,
                CreditLedger.reason_code == LedgerReason.BOOKING_DEDUCT,
            )
        )
    )


# --- Đường thành công --------------------------------------------------------


def test_booking_deducts_exactly_one_credit(db: Session, world) -> None:
    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()

    assert outcome.booking.status is BookingStatus.BOOKED
    assert credit_ledger.balance_of(db, world["package"].id) == 9
    assert _deducts(db, outcome.booking.id) == 1
    assert_ledger_is_sound(db)


def test_package_chosen_is_the_one_expiring_first(db: Session, world) -> None:
    """Hai gói cùng dùng được thì tiêu gói hết hạn trước.

    Quy tắc phải **tất định**: hai lần đặt giống hệt nhau mà tiêu vào hai gói
    khác nhau thì không ai đối chiếu được sổ với thực tế.
    """
    later = give_package(db, world["student"], world["admin"].id, credits=5, end_offset_days=200)
    sooner = world["package"]

    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()

    assert outcome.student_package_id == sooner.id
    assert credit_ledger.balance_of(db, later.id) == 5


# --- Bốn lý do từ chối, bốn thông báo ---------------------------------------


def test_student_without_any_package_is_told_so(db: Session, world) -> None:
    other, other_user = make_student_account(db, "Học viên Không Gói")
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=other.id,
            actor=actor_for(db, other_user),
        )
    assert exc.value.code == "NO_PACKAGE"


def test_expired_package_says_expired_not_out_of_credits(db: Session, world) -> None:
    other, other_user = make_student_account(db, "Học viên Hết Hạn")
    give_package(
        db,
        other,
        world["admin"].id,
        credits=10,
        start_offset_days=-90,
        end_offset_days=-1,
    )
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=other.id,
            actor=actor_for(db, other_user),
        )
    assert exc.value.code == "PACKAGE_EXPIRED"


def test_empty_package_says_out_of_credits(db: Session, world) -> None:
    other, other_user = make_student_account(db, "Học viên Hết Buổi")
    package = give_package(db, other, world["admin"].id, credits=1)
    booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=other.id,
        actor=actor_for(db, other_user),
    )
    db.commit()
    assert credit_ledger.balance_of(db, package.id) == 0

    second = make_session(
        db,
        world["trainer"],
        world["admin"].id,
        starts_at=now() + timedelta(days=2),
    )
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=second.id,
            student_id=other.id,
            actor=actor_for(db, other_user),
        )
    assert exc.value.code == "PACKAGE_OUT_OF_CREDITS"


def test_wrong_class_type_says_type_mismatch(db: Session, world) -> None:
    other, other_user = make_student_account(db, "Học viên Gói Private")
    give_package(db, other, world["admin"].id, credits=5, class_type=ClassType.PRIVATE)
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=other.id,
            actor=actor_for(db, other_user),
        )
    assert exc.value.code == "PACKAGE_TYPE_MISMATCH"


def test_full_session_says_full(db: Session, world) -> None:
    small = make_session(
        db,
        world["trainer"],
        world["admin"].id,
        starts_at=now() + timedelta(days=3),
        capacity=1,
    )
    booking_service.book(
        db,
        class_session_id=small.id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()

    other, other_user = make_student_account(db, "Học viên Đến Sau")
    give_package(db, other, world["admin"].id, credits=5)
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=small.id,
            student_id=other.id,
            actor=actor_for(db, other_user),
        )
    assert exc.value.code == "SESSION_FULL"


# --- Gói của người khác ------------------------------------------------------


def test_cannot_book_with_another_students_package(db: Session, world) -> None:
    """Truyền id gói của người khác không được đặt hộ mình một buổi tập.

    Đây là lỗ nguy hiểm nhất vì nó **im lặng**: booking ghi cho A, bút toán trừ
    vào gói của B, và phép đối soát vẫn xanh — dòng ledger gian lận vẫn là một
    dòng thật, `SUM(delta)` vẫn khớp. Chỉ B là người phát hiện, bằng cách một
    ngày nào đó thấy mình hết buổi sớm.
    """
    victim = make_student(db, "Học viên Bị Hại")
    victim_package = give_package(db, victim, world["admin"].id, credits=10)

    with pytest.raises(NotFoundError):
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=world["student"].id,
            actor=world["student_actor"],
            student_package_id=victim_package.id,
        )
    db.rollback()
    assert credit_ledger.balance_of(db, victim_package.id) == 10


def test_database_refuses_a_booking_pointing_at_another_students_package(
    db: Session, world
) -> None:
    """Lớp phòng vệ thứ hai: composite FK, không phải phép kiểm ở tầng app.

    Nếu một ngày có đường ghi mới quên gọi `_select_package` thì đây là thứ
    duy nhất còn lại.
    """
    from sqlalchemy.exc import IntegrityError

    victim = make_student(db, "Học viên Bị Hại 2")
    victim_package = give_package(db, victim, world["admin"].id, credits=10)

    db.add(
        Booking(
            class_session_id=world["session"].id,
            student_id=world["student"].id,
            student_package_id=victim_package.id,
            status=BookingStatus.BOOKED,
            booked_by_user_id=world["admin"].id,
        )
    )
    with pytest.raises(IntegrityError) as exc:
        db.flush()
    assert "fk_booking_package_belongs_to_student" in str(exc.value.orig)
    db.rollback()


# --- Trạng thái buổi lớp -----------------------------------------------------


def test_cannot_book_a_cancelled_session(db: Session, world) -> None:
    scheduling.cancel_session(
        db,
        session_id=world["session"].id,
        actor_user_id=world["admin"].id,
        reason="HLV nghỉ ốm",
    )
    db.commit()
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=world["student"].id,
            actor=world["student_actor"],
        )
    assert exc.value.code == "SESSION_CANCELLED"


def test_cannot_book_a_session_already_started(db: Session, world) -> None:
    past = make_session(
        db, world["trainer"], world["admin"].id, starts_at=now() - timedelta(hours=2)
    )
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=past.id,
            student_id=world["student"].id,
            actor=world["student_actor"],
        )
    assert exc.value.code == "SESSION_STARTED"


def test_second_booking_for_the_same_session_is_refused(db: Session, world) -> None:
    booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()
    with pytest.raises(BusinessError) as exc:
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=world["student"].id,
            actor=world["student_actor"],
        )
    assert exc.value.code == "ALREADY_BOOKED"
    db.rollback()
    assert credit_ledger.balance_of(db, world["package"].id) == 9


# --- Quyền — nằm trong service ----------------------------------------------


def test_student_cannot_book_for_someone_else(db: Session, world) -> None:
    other = make_student(db, "Học viên Khác")
    give_package(db, other, world["admin"].id, credits=5)
    with pytest.raises(ForbiddenError):
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=other.id,
            actor=world["student_actor"],
        )


def test_trainer_cannot_book_even_for_their_own_class(db: Session, world) -> None:
    trainer_user = make_user(db, Role.TRAINER, email="hlv-dat-thay@example.com")
    trainer = make_trainer(db, "HLV Của Lớp Khác", user=trainer_user)
    trainer_actor = actor_for(db, trainer_user)

    with pytest.raises(ForbiddenError):
        booking_service.book(
            db,
            class_session_id=world["session"].id,
            student_id=world["student"].id,
            actor=trainer_actor,
        )

    own = make_session(db, trainer, world["admin"].id, starts_at=now() + timedelta(days=4))
    with pytest.raises(ForbiddenError):
        booking_service.book(
            db,
            class_session_id=own.id,
            student_id=world["student"].id,
            actor=trainer_actor,
        )
    assert credit_ledger.balance_of(db, world["package"].id) == 10


def test_only_student_can_register_without_staff_confirmation(db: Session, client, world) -> None:
    for role in (Role.ADMIN, Role.STAFF, Role.TRAINER):
        user = world["admin"] if role is Role.ADMIN else make_user(db, role)
        token = login(client, user.email)["access_token"]
        response = client.post(
            "/bookings",
            headers=auth_header(token),
            json={
                "class_session_id": world["session"].id,
                "student_id": world["student"].id,
            },
        )
        assert response.status_code == 403, response.text
    token = login(client, world["student_user"].email)["access_token"]
    response = client.post(
        "/bookings",
        headers=auth_header(token),
        json={
            "class_session_id": world["session"].id,
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["booking"]["status"] == "BOOKED"
    assert response.json()["credits_remaining"] == 9
    assert_ledger_is_sound(db)


def test_cancelling_in_time_refunds_the_credit(db: Session, world) -> None:
    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()
    result = booking_service.cancel_booking(
        db, booking_id=outcome.booking.id, actor=world["student_actor"]
    )
    db.commit()

    assert result.refunded is True
    assert result.status is BookingStatus.CANCELLED_INTIME
    assert credit_ledger.balance_of(db, world["package"].id) == 10
    assert_ledger_is_sound(db)


def test_cancelling_after_cutoff_keeps_booking_and_deducted_credit(db: Session, world) -> None:
    soon = make_session(
        db, world["trainer"], world["admin"].id, starts_at=now() + timedelta(hours=2)
    )
    outcome = booking_service.book(
        db,
        class_session_id=soon.id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()
    with pytest.raises(BusinessError) as exc:
        booking_service.cancel_booking(
            db, booking_id=outcome.booking.id, actor=world["student_actor"]
        )
    assert exc.value.code == "CANCELLATION_CLOSED"
    db.rollback()
    assert db.get(Booking, outcome.booking.id).status is BookingStatus.BOOKED
    assert credit_ledger.balance_of(db, world["package"].id) == 9
    assert_ledger_is_sound(db)


def test_student_cannot_cancel_another_students_booking(db: Session, world) -> None:
    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()

    intruder, intruder_user = make_student_account(db, "Học viên Tọc Mạch")
    with pytest.raises(ForbiddenError):
        booking_service.cancel_booking(
            db, booking_id=outcome.booking.id, actor=actor_for(db, intruder_user)
        )


# --- Đổi lớp -----------------------------------------------------------------


def test_changing_class_in_time_is_credit_neutral(db: Session, world) -> None:
    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()
    target = make_session(
        db, world["trainer"], world["admin"].id, starts_at=now() + timedelta(days=8)
    )

    result = booking_service.change_booking(
        db,
        booking_id=outcome.booking.id,
        new_class_session_id=target.id,
        actor=world["student_actor"],
    )
    db.commit()

    assert result.cancelled.refunded is True
    assert result.booked.booking.class_session_id == target.id
    assert credit_ledger.balance_of(db, world["package"].id) == 9
    assert_ledger_is_sound(db)


def test_changing_class_after_cutoff_is_blocked(db: Session, world) -> None:
    """Đổi lớp không phải đường vòng để né hạn hủy."""
    soon = make_session(
        db, world["trainer"], world["admin"].id, starts_at=now() + timedelta(hours=2)
    )
    outcome = booking_service.book(
        db,
        class_session_id=soon.id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()
    target = make_session(
        db, world["trainer"], world["admin"].id, starts_at=now() + timedelta(days=9)
    )

    with pytest.raises(BusinessError) as exc:
        booking_service.change_booking(
            db,
            booking_id=outcome.booking.id,
            new_class_session_id=target.id,
            actor=world["student_actor"],
        )
    assert exc.value.code == "CANCELLATION_CLOSED"
    db.rollback()
    assert credit_ledger.balance_of(db, world["package"].id) == 9
    assert db.get(Booking, outcome.booking.id).status is BookingStatus.BOOKED
    assert_ledger_is_sound(db)


def test_changing_to_the_same_session_is_refused(db: Session, world) -> None:
    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.commit()
    with pytest.raises(BusinessError) as exc:
        booking_service.change_booking(
            db,
            booking_id=outcome.booking.id,
            new_class_session_id=world["session"].id,
            actor=world["student_actor"],
        )
    assert exc.value.code == "SAME_SESSION"


def test_the_schedule_screen_stops_promising_a_refund_after_the_class_starts(
    db: Session, client, world
) -> None:
    """Giao diện và service phải nói cùng một điều.

    `refund_if_cancelled_now` là thứ màn hình in thành chữ cho học viên đọc
    trước khi bấm. Nó hứa hoàn buổi trong khi service không hoàn là cách tệ
    nhất để sai.
    """
    outcome = booking_service.book(
        db,
        class_session_id=world["session"].id,
        student_id=world["student"].id,
        actor=world["student_actor"],
    )
    db.execute(
        update(Booking).where(Booking.id == outcome.booking.id).values(has_reschedule_grace=True)
    )
    world["session"].starts_at = now() - timedelta(days=1)
    world["session"].ends_at = now() - timedelta(days=1) + timedelta(hours=1)
    db.commit()

    token = login(client, world["student_user"].email)["access_token"]
    rows = client.get("/my-schedule", headers=auth_header(token)).json()
    row = next(item for item in rows if item["booking_id"] == outcome.booking.id)

    assert row["refund_if_cancelled_now"] is False
    assert row["can_cancel"] is False, "Sau hạn hủy, lượt đăng ký bị khóa."
