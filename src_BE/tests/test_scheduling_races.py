"""Đua và tính nguyên tử ở lịch lớp (F06).

Ba hỏng hóc dưới đây đều **im lặng**: hệ thống trả 200, dữ liệu trông bình
thường, và tiêu chí nghiệm thu vẫn đọc như đã đạt. Chỉ có test đồng thời mới
thấy chúng.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.domain.rules import (
    TIMEZONE,
    BookingStatus,
    ClassType,
    LedgerReason,
    Role,
    SessionStatus,
    now,
    today,
)
from app.models.money import CreditLedger
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession
from app.services import credit_ledger, recurrence, scheduling
from app.services.ledger_invariants import assert_ledger_is_sound
from app.services.package_sales import PackageSpec, sell_package
from tests.conftest import make_user


def _trainer(db: Session, name: str = "HLV Demo 01") -> Trainer:
    trainer = Trainer(full_name=name)
    db.add(trainer)
    db.commit()
    return trainer


def _student_with_package(db: Session, admin_id: int, *, phone: str, credits: int = 10):
    student = Student(full_name=f"Học viên {phone[-2:]}", phone=phone)
    db.add(student)
    db.flush()
    package = sell_package(
        db,
        student_id=student.id,
        spec=PackageSpec(
            name="Gói Demo",
            price=Decimal("2500000.00"),
            credits=credits,
            class_type=ClassType.GROUP,
            start_date=today() - timedelta(days=1),
            end_date=today() + timedelta(days=89),
        ),
        actor_user_id=admin_id,
    )
    db.commit()
    return student, package


# --- Trùng giờ HLV -----------------------------------------------------------


def test_concurrent_creates_cannot_double_book_a_trainer(db: Session) -> None:
    """Hai yêu cầu tạo lớp đồng thời, cùng HLV, cùng khung giờ.

    Kiểm ở tầng ứng dụng không chặn được: cả hai transaction đều đọc "chưa có
    lớp nào" trước khi một trong hai kịp ghi. Ràng buộc `EXCLUDE` ở CSDL là
    lớp duy nhất phán quyết được.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    starts = now() + timedelta(days=2)

    def create() -> str:
        session = SessionLocal()
        try:
            scheduling.create_session(
                session,
                starts_at=starts,
                ends_at=starts + timedelta(hours=1),
                trainer_id=trainer.id,
                class_type=ClassType.GROUP,
                capacity=6,
                actor_user_id=admin.id,
            )
            session.commit()
            return "ok"
        except Exception as exc:  # noqa: BLE001 — chỉ phân loại kết quả
            session.rollback()
            return type(exc).__name__
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [future.result() for future in [pool.submit(create) for _ in range(2)]]

    assert results.count("ok") == 1, results
    assert db.scalar(select(func.count()).select_from(ClassSession)) == 1


def test_cancelled_class_frees_the_slot_for_a_new_one(db: Session) -> None:
    """Mệnh đề `WHERE status = 'SCHEDULED'` của ràng buộc phải hoạt động.

    Thiếu nó, một lớp đã hủy vẫn chiếm khung giờ của chính nó và chặn vĩnh viễn
    giờ đó của HLV — phá thẳng hạng mục "sửa/hủy lớp & xử lý xung đột".
    """
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    starts = now() + timedelta(days=2)

    first = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()

    scheduling.cancel_session(
        db, session_id=first.id, actor_user_id=admin.id, reason="Đổi lịch studio."
    )
    db.commit()

    replacement = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()
    assert replacement.id != first.id


# --- Hủy lớp đua với đặt ghế cuối --------------------------------------------


def test_cancelling_holds_the_session_lock_while_refunding(db: Session, monkeypatch) -> None:
    """Luồng hủy phải **đang giữ khoá** trên buổi lớp lúc nó hoàn buổi.

    Đây là bất biến thật, và nó kiểm được trực tiếp: trong lúc `cancel_session`
    chạy vòng hoàn, một kết nối khác thử `SELECT ... FOR UPDATE NOWAIT` trên
    chính buổi lớp đó và **phải** nhận `LockNotAvailable`.

    Không khoá thì đây là lỗ hổng: nhân viên bấm hủy, 200ms sau học viên D đặt
    ghế cuối, transaction của D lấy khoá ngay, đọc `status` vẫn `SCHEDULED`
    (chưa commit), đặt thành công và bị trừ 1 buổi. Transaction hủy commit sau.
    D giữ đăng ký trên lớp đã hủy, mất 1 buổi, **không có dòng hoàn nào**.

    Khẳng định vào chính phép khoá thay vì vào kết quả cuối: một test chỉ nhìn
    kết quả vẫn xanh trên bản không khoá, vì nó không dựng được đúng khe thời
    gian giữa hai câu lệnh.
    """
    from psycopg import errors as pg_errors
    from sqlalchemy.exc import OperationalError

    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    student, package = _student_with_package(db, admin.id, phone="0900000001")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.flush()
    booking = Booking(
        class_session_id=class_session.id,
        student_id=student.id,
        student_package_id=package.id,
        booked_by_user_id=admin.id,
        status=BookingStatus.BOOKED,
    )
    db.add(booking)
    db.flush()
    credit_ledger.record(
        db,
        student_package_id=package.id,
        delta=-1,
        reason=LedgerReason.BOOKING_DEDUCT,
        actor_user_id=admin.id,
        booking_id=booking.id,
    )
    db.commit()
    session_id = class_session.id

    observed: dict[str, str] = {}
    original_record = credit_ledger.record

    def probe_lock_then_record(session, **kwargs):
        """Chạy đúng lúc vòng hoàn đang chạy — tức là sau bước khoá."""
        if "result" not in observed:
            other = SessionLocal()
            try:
                other.execute(
                    text("SELECT id FROM class_session WHERE id = :i FOR UPDATE NOWAIT"),
                    {"i": session_id},
                )
                observed["result"] = "acquired"
            except OperationalError as exc:
                observed["result"] = (
                    "blocked"
                    if isinstance(exc.orig, pg_errors.LockNotAvailable)
                    else type(exc.orig).__name__
                )
            finally:
                other.rollback()
                other.close()
        return original_record(session, **kwargs)

    monkeypatch.setattr(scheduling.credit_ledger, "record", probe_lock_then_record)

    scheduling.cancel_session(
        db, session_id=session_id, actor_user_id=admin.id, reason="HLV nghỉ ốm."
    )
    db.commit()

    assert observed.get("result") == "blocked", (
        "Buổi lớp KHÔNG bị khoá trong lúc hoàn buổi — người đặt ghế cuối sẽ "
        f"chen được vào và mất buổi (quan sát: {observed})"
    )
    assert credit_ledger.balance_of(db, package.id) == 10
    assert_ledger_is_sound(db)


def test_cancelling_refunds_a_booking_committed_after_the_first_read(
    db: Session, monkeypatch
) -> None:
    """Bước đọc lại dưới khoá phải bắt được người chen vào giữa chừng.

    Đăng ký được commit từ một kết nối khác **sau** khi luồng hủy đọc xong danh
    sách gói ở bước 1. Bước 4 đọc lại dưới khoá là thứ duy nhất nhìn thấy nó.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    student, package = _student_with_package(db, admin.id, phone="0900000001")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()
    session_id, package_id, student_id = class_session.id, package.id, student.id

    sneaked: dict[str, int] = {}
    original_lock_packages = credit_ledger.lock_packages

    def lock_packages_then_let_someone_sneak_in(session, ids):
        result = original_lock_packages(session, ids)
        if "booking_id" not in sneaked:
            other = SessionLocal()
            try:
                booking = Booking(
                    class_session_id=session_id,
                    student_id=student_id,
                    student_package_id=package_id,
                    booked_by_user_id=admin.id,
                    status=BookingStatus.BOOKED,
                )
                other.add(booking)
                other.flush()
                credit_ledger.record(
                    other,
                    student_package_id=package_id,
                    delta=-1,
                    reason=LedgerReason.BOOKING_DEDUCT,
                    actor_user_id=admin.id,
                    booking_id=booking.id,
                )
                other.commit()
                sneaked["booking_id"] = booking.id
            finally:
                other.close()
        return result

    monkeypatch.setattr(
        scheduling.credit_ledger, "lock_packages", lock_packages_then_let_someone_sneak_in
    )

    outcome = scheduling.cancel_session(
        db, session_id=session_id, actor_user_id=admin.id, reason="HLV nghỉ ốm."
    )
    db.commit()

    assert sneaked, "Kịch bản đua không chạy — không có ai chen vào"
    assert outcome.refunded_booking_ids == [sneaked["booking_id"]]
    assert credit_ledger.balance_of(db, package_id) == 10
    assert_ledger_is_sound(db)


def test_a_booking_cannot_land_on_a_cancelled_class(db: Session) -> None:
    """CSDL cấm đăng ký `BOOKED` trên lớp đã hủy.

    Bước đọc lại của `cancel_session` chỉ đúng nếu mọi đường ghi `booking` cũng
    khoá `class_session`. Hợp đồng đó không thể sống trong docstring: F07, một
    script vận hành hay một lần nhập liệu đều có thể quên. Trigger đưa nó xuống
    tầng không ai quên được.
    """
    from sqlalchemy.exc import IntegrityError, InternalError

    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    student, package = _student_with_package(db, admin.id, phone="0900000001")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()
    scheduling.cancel_session(
        db, session_id=class_session.id, actor_user_id=admin.id, reason="HLV nghỉ ốm."
    )
    db.commit()

    import pytest

    with pytest.raises((IntegrityError, InternalError)):
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


def test_cancelling_does_not_refund_an_already_cancelled_booking(db: Session) -> None:
    """Lọc `status = 'BOOKED'` là bắt buộc.

    Thiếu nó, một đăng ký đã hủy đúng hạn — đã được hoàn một lần — sẽ được hoàn
    lần thứ hai khi studio hủy lớp.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    student, package = _student_with_package(db, admin.id, phone="0900000001")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.flush()

    booking = Booking(
        class_session_id=class_session.id,
        student_id=student.id,
        student_package_id=package.id,
        booked_by_user_id=admin.id,
        status=BookingStatus.BOOKED,
    )
    db.add(booking)
    db.flush()
    credit_ledger.record(
        db,
        student_package_id=package.id,
        delta=-1,
        reason=LedgerReason.BOOKING_DEDUCT,
        actor_user_id=admin.id,
        booking_id=booking.id,
    )
    # Học viên tự hủy đúng hạn: đã được hoàn một lần.
    booking.status = BookingStatus.CANCELLED_INTIME
    credit_ledger.record(
        db,
        student_package_id=package.id,
        delta=1,
        reason=LedgerReason.CANCEL_REFUND,
        actor_user_id=admin.id,
        booking_id=booking.id,
    )
    db.commit()
    assert credit_ledger.balance_of(db, package.id) == 10

    outcome = scheduling.cancel_session(
        db, session_id=class_session.id, actor_user_id=admin.id, reason="Studio đóng cửa."
    )
    db.commit()

    assert outcome.refunded_booking_ids == []
    assert credit_ledger.balance_of(db, package.id) == 10
    refunds = db.scalar(
        select(func.count())
        .select_from(CreditLedger)
        .where(
            CreditLedger.booking_id == booking.id,
            CreditLedger.reason_code == LedgerReason.CANCEL_REFUND,
        )
    )
    assert refunds == 1
    assert_ledger_is_sound(db)


def test_concurrent_cancels_refund_exactly_once(db: Session) -> None:
    """Hai nhân viên bấm hủy cùng lúc: hoàn đúng một lần."""
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    student, package = _student_with_package(db, admin.id, phone="0900000001")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.flush()
    booking = Booking(
        class_session_id=class_session.id,
        student_id=student.id,
        student_package_id=package.id,
        booked_by_user_id=admin.id,
        status=BookingStatus.BOOKED,
    )
    db.add(booking)
    db.flush()
    credit_ledger.record(
        db,
        student_package_id=package.id,
        delta=-1,
        reason=LedgerReason.BOOKING_DEDUCT,
        actor_user_id=admin.id,
        booking_id=booking.id,
    )
    db.commit()

    def cancel() -> str:
        session = SessionLocal()
        try:
            scheduling.cancel_session(
                session,
                session_id=class_session.id,
                actor_user_id=admin.id,
                reason="Hủy đồng thời.",
            )
            session.commit()
            return "ok"
        except Exception as exc:  # noqa: BLE001
            session.rollback()
            return type(exc).__name__
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [future.result() for future in [pool.submit(cancel) for _ in range(2)]]

    assert results.count("ok") == 1, results
    assert credit_ledger.balance_of(db, package.id) == 10
    assert_ledger_is_sound(db)


# --- Dời giờ lớp -------------------------------------------------------------


# --- Lịch lặp lại ------------------------------------------------------------


def test_recurrence_is_all_or_nothing(db: Session) -> None:
    """Một buổi vỡ thì cả nhóm rollback.

    Ghi được bao nhiêu hay bấy nhiêu sẽ để lại một `recurrence_id` dở dang mà
    nhân viên không nhìn ra là dở dang.
    """
    from app.core.errors import BusinessError

    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    start_day = today() + timedelta(days=7)
    # Lùi tới thứ Hai để bộ ngày sinh ra ổn định.
    start_day += timedelta(days=(0 - start_day.weekday()) % 7)

    payload = {
        "start_date": start_day,
        "end_date": start_day + timedelta(days=21),
        "weekdays": {0},
        "start_time": time(18, 0),
        "duration_minutes": 60,
        "trainer_id": trainer.id,
    }
    preview = recurrence.build_preview(db, **payload)
    assert len(preview.occurrences) == 4
    assert preview.conflicts == []

    # Ai đó chiếm khung giờ của buổi thứ ba **sau** khi nhân viên đã xem trước.
    third = preview.occurrences[2]
    scheduling.create_session(
        db,
        starts_at=third.starts_at,
        ends_at=third.ends_at,
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()
    before = db.scalar(select(func.count()).select_from(ClassSession))

    try:
        recurrence.create_recurring_sessions(
            db,
            occurrences=preview.occurrences,
            trainer_id=trainer.id,
            class_type=ClassType.GROUP,
            capacity=6,
            actor_user_id=admin.id,
        )
        raise AssertionError("Nhóm buổi có xung đột phải bị từ chối toàn bộ")
    except BusinessError as exc:
        assert exc.code == "RECURRENCE_CONFLICT"

    db.rollback()
    assert db.scalar(select(func.count()).select_from(ClassSession)) == before


def test_recurrence_preview_marks_conflicts_and_creates_the_rest(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    start_day = today() + timedelta(days=7)
    start_day += timedelta(days=(0 - start_day.weekday()) % 7)

    payload = {
        "start_date": start_day,
        "end_date": start_day + timedelta(days=21),
        "weekdays": {0},
        "start_time": time(18, 0),
        "duration_minutes": 60,
        "trainer_id": trainer.id,
    }
    first_preview = recurrence.build_preview(db, **payload)
    scheduling.create_session(
        db,
        starts_at=first_preview.occurrences[1].starts_at,
        ends_at=first_preview.occurrences[1].ends_at,
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()

    preview = recurrence.build_preview(db, **payload)
    assert len(preview.conflicts) == 1
    assert len(preview.available) == 3

    recurrence_id, created = recurrence.create_recurring_sessions(
        db,
        occurrences=preview.occurrences,
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()

    assert len(created) == 3
    assert all(item.recurrence_id == recurrence_id for item in created)


def test_recurrence_occurrences_land_on_studio_local_time(db: Session) -> None:
    """Buổi 18:00 phải là 18:00 **giờ studio**, không phải giờ container."""
    trainer = _trainer(db)
    start_day = date(2026, 10, 19)  # thứ Hai

    preview = recurrence.build_preview(
        db,
        start_date=start_day,
        end_date=start_day,
        weekdays={0},
        start_time=time(18, 0),
        duration_minutes=60,
        trainer_id=trainer.id,
    )
    occurrence = preview.occurrences[0]
    local = occurrence.starts_at.astimezone(TIMEZONE)
    assert (local.hour, local.minute) == (18, 0)
    assert occurrence.starts_at.utcoffset() == timedelta(hours=7)


def test_cancelled_session_is_not_reported_as_scheduled(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    starts = now() + timedelta(days=2)
    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.commit()

    scheduling.cancel_session(
        db, session_id=class_session.id, actor_user_id=admin.id, reason="Không đủ người."
    )
    db.commit()

    db.refresh(class_session)
    assert class_session.status is SessionStatus.CANCELLED
    assert class_session.cancelled_by == admin.id
    assert class_session.cancelled_at is not None
    assert class_session.cancel_reason == "Không đủ người."


# --- Hàng chờ khi hủy lớp ----------------------------------------------------


def test_cancelling_a_class_clears_its_waitlist(db: Session) -> None:
    """Lớp không còn thì hàng chờ của nó cũng không còn nghĩa.

    Để lại entry `WAITING` trên một lớp đã hủy nghĩa là nhân viên sẽ thấy người
    cần xử lý cho một buổi không bao giờ diễn ra.
    """
    from app.domain.rules import WaitlistStatus
    from app.models.scheduling import WaitlistEntry

    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    waiting_student, _ = _student_with_package(db, admin.id, phone="0900000002")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.flush()
    entry = WaitlistEntry(
        class_session_id=class_session.id,
        student_id=waiting_student.id,
        created_by_user_id=admin.id,
        status=WaitlistStatus.WAITING,
    )
    db.add(entry)
    db.commit()

    outcome = scheduling.cancel_session(
        db, session_id=class_session.id, actor_user_id=admin.id, reason="HLV nghỉ ốm."
    )
    db.commit()
    db.refresh(entry)

    assert outcome.cancelled_waitlist_ids == [entry.id]
    assert entry.status is WaitlistStatus.CANCELLED
    # "Mọi thay đổi trạng thái lưu người thực hiện **và thời điểm**".
    assert entry.cancelled_by_user_id == admin.id
    assert entry.cancelled_at is not None


def test_cancelling_leaves_already_resolved_waitlist_entries_alone(db: Session) -> None:
    """Chỉ entry `WAITING` bị huỷ theo — entry đã xử lý xong giữ nguyên lịch sử."""
    from app.domain.rules import WaitlistStatus
    from app.models.scheduling import WaitlistEntry

    admin = make_user(db, Role.ADMIN)
    trainer = _trainer(db)
    promoted_student, _ = _student_with_package(db, admin.id, phone="0900000003")
    starts = now() + timedelta(days=2)

    class_session = scheduling.create_session(
        db,
        starts_at=starts,
        ends_at=starts + timedelta(hours=1),
        trainer_id=trainer.id,
        class_type=ClassType.GROUP,
        capacity=6,
        actor_user_id=admin.id,
    )
    db.flush()
    entry = WaitlistEntry(
        class_session_id=class_session.id,
        student_id=promoted_student.id,
        created_by_user_id=admin.id,
        status=WaitlistStatus.PROMOTED,
        promoted_by_user_id=admin.id,
        promoted_at=now(),
    )
    db.add(entry)
    db.commit()

    outcome = scheduling.cancel_session(
        db, session_id=class_session.id, actor_user_id=admin.id, reason="Studio đóng cửa."
    )
    db.commit()
    db.refresh(entry)

    assert outcome.cancelled_waitlist_ids == []
    assert entry.status is WaitlistStatus.PROMOTED
