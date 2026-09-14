"""Ràng buộc ở tầng CSDL (F00).

Mỗi test ở đây chứng minh một ràng buộc **chặn được** điều nó nói là chặn.
Một ràng buộc chưa bao giờ thấy fail là một ràng buộc chưa biết có hoạt động
hay không.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, InternalError
from sqlalchemy.orm import Session

from app.domain.rules import (
    BookingStatus,
    ClassType,
    LedgerReason,
    Role,
    SessionStatus,
    now,
)
from app.models.money import CreditLedger, StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession, WaitlistEntry
from tests.conftest import make_user


def _student(db: Session, name: str = "Học viên Demo 01", phone: str = "0900000001") -> Student:
    student = Student(full_name=name, phone=phone)
    db.add(student)
    db.flush()
    return student


def _trainer(db: Session, name: str = "HLV Demo 01") -> Trainer:
    trainer = Trainer(full_name=name)
    db.add(trainer)
    db.flush()
    return trainer


def _package(db: Session, student: Student, credits: int = 10) -> StudentPackage:
    package = StudentPackage(
        student_id=student.id,
        name_snapshot="Gói Demo",
        price_snapshot=Decimal("1000000.00"),
        credits_snapshot=credits,
        class_type_snapshot=ClassType.GROUP,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        balance_cached=0,
    )
    db.add(package)
    db.flush()
    return package


def _session(
    db: Session, trainer: Trainer, actor_id: int, hours_from_now: int = 24, capacity: int = 6
) -> ClassSession:
    starts = now() + timedelta(hours=hours_from_now)
    class_session = ClassSession(
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=capacity,
        created_by=actor_id,
    )
    db.add(class_session)
    db.flush()
    return class_session


def _credit(db: Session, package: StudentPackage, delta: int, actor_id: int, **kwargs) -> None:
    """Ghi một dòng ledger và cập nhật số dư — mô phỏng đúng điều
    `credit_ledger.py` sẽ làm ở F05."""
    db.add(
        CreditLedger(
            student_package_id=package.id,
            delta=delta,
            reason_code=kwargs.pop("reason_code", LedgerReason.PACKAGE_SOLD),
            actor_user_id=actor_id,
            **kwargs,
        )
    )
    package.balance_cached += delta
    db.flush()


# --- Sổ buổi append-only -----------------------------------------------------


def test_credit_ledger_reject_update(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises((IntegrityError, InternalError)) as exc:
        db.execute(text("UPDATE credit_ledger SET delta = 99"))
        db.commit()
    assert "append-only" in str(exc.value)


def test_credit_ledger_reject_delete(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises((IntegrityError, InternalError)) as exc:
        db.execute(text("DELETE FROM credit_ledger"))
        db.commit()
    assert "append-only" in str(exc.value)


def test_admin_adjust_without_note_rejected(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises(IntegrityError):
        _credit(db, package, 1, admin.id, reason_code=LedgerReason.ADMIN_ADJUST)
        db.commit()


def test_admin_adjust_with_note_accepted(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    _credit(
        db,
        package,
        1,
        admin.id,
        reason_code=LedgerReason.ADMIN_ADJUST,
        note="Trả buổi do studio đổi lịch.",
    )
    db.commit()
    assert package.balance_cached == 11


# --- Số dư không âm và khớp ledger ------------------------------------------


def test_negative_balance_rejected(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 1, admin.id)
    db.commit()

    with pytest.raises(IntegrityError):
        _credit(db, package, -2, admin.id, reason_code=LedgerReason.BOOKING_DEDUCT)
        db.commit()


def test_balance_written_outside_ledger_is_rejected(db: Session) -> None:
    """Ghi thẳng `balance_cached` mà không có bút toán tương ứng phải vỡ ở commit.

    Đây là thứ giữ cho `balance_cached` là biểu diễn **độc lập** — nếu sửa rời
    được thì phép đối soát `balance_cached = SUM(delta)` quay về vô nghĩa.
    """
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises((IntegrityError, InternalError)) as exc:
        db.execute(
            text("UPDATE student_package SET balance_cached = 99 WHERE id = :i"),
            {"i": package.id},
        )
        db.commit()
    assert "balance_cached" in str(exc.value)


def test_ledger_row_without_balance_update_is_rejected(db: Session) -> None:
    """Chiều ngược lại: ghi bút toán mà quên cập nhật số dư cũng phải vỡ."""
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    db.commit()

    with pytest.raises((IntegrityError, InternalError)):
        db.add(
            CreditLedger(
                student_package_id=package.id,
                delta=5,
                reason_code=LedgerReason.PACKAGE_SOLD,
                actor_user_id=admin.id,
            )
        )
        db.commit()


def test_double_refund_for_one_booking_rejected(db: Session) -> None:
    """Double-click hủy không được hoàn hai lần."""
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    package = _package(db, student)
    trainer = _trainer(db)
    class_session = _session(db, trainer, admin.id)
    _credit(db, package, 10, admin.id)

    booking = Booking(
        class_session_id=class_session.id,
        student_id=student.id,
        student_package_id=package.id,
        booked_by_user_id=admin.id,
        status=BookingStatus.CANCELLED_INTIME,
    )
    db.add(booking)
    db.flush()
    _credit(
        db,
        package,
        1,
        admin.id,
        reason_code=LedgerReason.CANCEL_REFUND,
        booking_id=booking.id,
    )
    db.commit()

    with pytest.raises(IntegrityError):
        _credit(
            db,
            package,
            1,
            admin.id,
            reason_code=LedgerReason.CANCEL_REFUND,
            booking_id=booking.id,
        )
        db.commit()


# --- Booking -----------------------------------------------------------------


def test_booking_cannot_use_another_students_package(db: Session) -> None:
    """Composite FK chặn ở tầng CSDL, không chỉ ở tầng app.

    Không có nó: học viên A truyền `student_package_id` của B (đoán bằng cách
    tăng id), booking ghi cho A còn bút toán trừ vào gói của B.
    """
    admin = make_user(db, Role.ADMIN)
    student_a = _student(db, phone="0900000001")
    student_b = _student(db, name="Học viên Demo 02", phone="0900000002")
    package_b = _package(db, student_b)
    class_session = _session(db, _trainer(db), admin.id)
    db.commit()

    with pytest.raises(IntegrityError):
        db.add(
            Booking(
                class_session_id=class_session.id,
                student_id=student_a.id,
                student_package_id=package_b.id,
                booked_by_user_id=admin.id,
            )
        )
        db.commit()


def test_duplicate_active_booking_rejected(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    package = _package(db, student)
    class_session = _session(db, _trainer(db), admin.id)

    db.add(
        Booking(
            class_session_id=class_session.id,
            student_id=student.id,
            student_package_id=package.id,
            booked_by_user_id=admin.id,
        )
    )
    db.commit()

    with pytest.raises(IntegrityError):
        db.add(
            Booking(
                class_session_id=class_session.id,
                student_id=student.id,
                student_package_id=package.id,
                booked_by_user_id=admin.id,
            )
        )
        db.commit()


def test_cancelled_booking_does_not_block_rebooking(db: Session) -> None:
    """Partial unique loại các lượt đã hủy — hủy rồi phải đặt lại được."""
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    package = _package(db, student)
    class_session = _session(db, _trainer(db), admin.id)

    db.add(
        Booking(
            class_session_id=class_session.id,
            student_id=student.id,
            student_package_id=package.id,
            booked_by_user_id=admin.id,
            status=BookingStatus.CANCELLED_INTIME,
        )
    )
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


def test_duplicate_waiting_entry_rejected(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    student = _student(db)
    class_session = _session(db, _trainer(db), admin.id)
    db.add(
        WaitlistEntry(
            class_session_id=class_session.id,
            student_id=student.id,
            created_by_user_id=admin.id,
        )
    )
    db.commit()

    with pytest.raises(IntegrityError):
        db.add(
            WaitlistEntry(
                class_session_id=class_session.id,
                student_id=student.id,
                created_by_user_id=admin.id,
            )
        )
        db.commit()


# --- Trùng giờ HLV -----------------------------------------------------------


def test_trainer_overlapping_sessions_rejected(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    first = _session(db, trainer, admin.id, hours_from_now=24)
    db.commit()

    overlapping = ClassSession(
        starts_at=first.starts_at + timedelta(minutes=30),
        ends_at=first.ends_at + timedelta(minutes=30),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        created_by=admin.id,
    )
    with pytest.raises(IntegrityError):
        db.add(overlapping)
        db.commit()


def test_cancelled_session_frees_the_slot(db: Session) -> None:
    """Mệnh đề `WHERE status = 'SCHEDULED'` phải hoạt động.

    Thiếu nó, một lớp đã hủy vẫn chiếm khung giờ của chính nó và chặn vĩnh viễn
    giờ đó của HLV.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    first = _session(db, trainer, admin.id, hours_from_now=24)
    first.status = SessionStatus.CANCELLED
    db.commit()

    db.add(
        ClassSession(
            starts_at=first.starts_at,
            ends_at=first.ends_at,
            trainer_id=trainer.id,
            class_type=ClassType.GROUP,
            capacity=6,
            created_by=admin.id,
        )
    )
    db.commit()


def test_adjacent_sessions_allowed(db: Session) -> None:
    """Lớp nối đuôi nhau không phải là chồng giờ — `tstzrange` nửa mở."""
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    first = _session(db, trainer, admin.id, hours_from_now=24)
    db.add(
        ClassSession(
            starts_at=first.ends_at,
            ends_at=first.ends_at + timedelta(hours=1),
            trainer_id=trainer.id,
            class_type=ClassType.GROUP,
            capacity=6,
            created_by=admin.id,
        )
    )
    db.commit()


def test_all_timestamp_columns_are_timezone_aware(db: Session) -> None:
    """Không cột thời gian nào được phép naive.

    Lệch 7 giờ vượt cả ngưỡng hủy 4h lẫn 1h, nên một cột `timestamp` thiếu
    múi giờ sẽ làm mọi lần hủy muộn được hoàn sai, vĩnh viễn.
    """
    rows = db.execute(
        text(
            "SELECT table_name, column_name, data_type "
            "FROM information_schema.columns "
            "WHERE table_schema = 'public' AND data_type LIKE 'timestamp%'"
        )
    ).all()
    naive = [r for r in rows if r.data_type != "timestamp with time zone"]
    assert not naive, f"Cột thời gian không có múi giờ: {naive}"


# --- Lỗ hổng ràng buộc phát hiện khi review F00/F01 --------------------------


@pytest.mark.parametrize(
    ("note", "label"),
    [("\n", "xuống dòng"), ("\t", "tab"), ("\u00a0", "khoảng trắng không ngắt"), (" ", "dấu cách")],
)
def test_admin_adjust_with_whitespace_only_note_rejected(
    db: Session, note: str, label: str
) -> None:
    """`btrim()` mặc định chỉ cắt dấu cách.

    Với CHECK cũ, `note = '\n'` qua được — nghĩa là điều chỉnh số buổi thủ công
    "không lý do" vẫn ghi được, chỉ cần gõ một ký tự vô hình.
    """
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises(IntegrityError):
        _credit(
            db, package, 1, admin.id, reason_code=LedgerReason.ADMIN_ADJUST, note=note
        )
        db.commit()


@pytest.mark.parametrize(
    "reason", [LedgerReason.BOOKING_DEDUCT, LedgerReason.CANCEL_REFUND]
)
def test_booking_reason_without_booking_id_rejected(
    db: Session, reason: LedgerReason
) -> None:
    """Hai partial unique index khoá theo `booking_id`, mà NULL không đụng unique.

    Một dòng `CANCEL_REFUND` thiếu `booking_id` vì thế vô hiệu hoá lớp chặn
    hoàn buổi hai lần, mà không ràng buộc nào kêu.
    """
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises(IntegrityError):
        _credit(db, package, 1, admin.id, reason_code=reason)
        db.commit()


def test_truncate_on_ledger_rejected(db: Session) -> None:
    """Trigger FOR EACH ROW không thấy TRUNCATE — sổ append-only vẫn xoá sạch được."""
    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    _credit(db, package, 10, admin.id)
    db.commit()

    with pytest.raises((IntegrityError, InternalError)) as exc:
        db.execute(text("TRUNCATE TABLE credit_ledger CASCADE"))
        db.commit()
    assert "TRUNCATE" in str(exc.value)


def test_void_payment_without_reason_rejected(db: Session) -> None:
    """`VOID` phải có lý do thật, không phải một ký tự vô hình."""
    from decimal import Decimal

    from app.domain.rules import PaymentMethod, PaymentStatus
    from app.models.money import Payment

    admin = make_user(db, Role.ADMIN)
    package = _package(db, _student(db))
    db.commit()

    with pytest.raises(IntegrityError):
        db.add(
            Payment(
                student_package_id=package.id,
                amount=Decimal("1000000.00"),
                method=PaymentMethod.CASH,
                status=PaymentStatus.VOID,
                recorded_by=admin.id,
                recorded_at=now(),
                voided_by=admin.id,
                voided_at=now(),
                void_reason="\n",
            )
        )
        db.commit()
