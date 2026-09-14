"""Đăng ký lớp dưới tải đồng thời.

Bốn kịch bản dưới đây là bốn cách hệ thống hỏng **mà không báo gì**: API trả
200, dữ liệu trông bình thường, và tiêu chí nghiệm thu vẫn đọc như đã đạt. Chỉ
có nhiều kết nối thật chạy cùng lúc mới dựng được khe thời gian giữa hai câu
lệnh, nên fixture `db` dùng chung một session không mô phỏng được bất kỳ kịch
bản nào ở đây.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.db import SessionLocal
from app.domain.rules import BookingStatus, LedgerReason, Role, SessionStatus, now
from app.models.money import CreditLedger
from app.models.scheduling import Booking, ClassSession
from app.models.user import User
from app.services import booking_service, credit_ledger, scheduling
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import make_user
from tests.factories import (
    actor_for,
    give_package,
    make_session,
    make_student_account,
    make_trainer,
)


def _book_in_own_transaction(user: User, class_session_id: int, student_id: int) -> str:
    """Một lần đặt lớp trên kết nối riêng. Trả 'ok' hoặc mã lỗi nghiệp vụ."""
    session = SessionLocal()
    try:
        actor = actor_for(session, session.merge(user))
        booking_service.book(
            session,
            class_session_id=class_session_id,
            student_id=student_id,
            actor=actor,
        )
        session.commit()
        return "ok"
    except BusinessError as exc:
        session.rollback()
        return exc.code
    except Exception as exc:  # noqa: BLE001 — chỉ phân loại kết quả
        session.rollback()
        return type(exc).__name__
    finally:
        session.close()


def _booked(db: Session, class_session_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.class_session_id == class_session_id,
                Booking.status == BookingStatus.BOOKED,
            )
        )
    )


def test_last_seat_goes_to_exactly_one_of_five(db: Session) -> None:
    """Năm người cùng giành ghế cuối.

    Thiếu `FOR UPDATE` trên `class_session` thì cả năm đều đếm được "còn chỗ"
    trước khi ai kịp ghi, và lớp một chỗ nhận năm người.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1), capacity=1
    )
    people = []
    for index in range(5):
        student, user = make_student_account(db, f"Học viên {index}")
        give_package(db, student, admin.id, credits=5)
        people.append((user, student))
    db.commit()

    with ThreadPoolExecutor(max_workers=5) as pool:
        results = [
            future.result()
            for future in [
                pool.submit(_book_in_own_transaction, user, class_session.id, student.id)
                for user, student in people
            ]
        ]

    assert results.count("ok") == 1, results
    assert _booked(db, class_session.id) == 1
    assert_ledger_is_sound(db)


def test_one_credit_cannot_pay_for_two_classes_at_once(db: Session) -> None:
    """Một người, **một buổi còn lại**, đặt hai lớp khác giờ trong cùng một giây.

    Đây là kịch bản mà khoá trên `class_session` không chạm tới: hai transaction
    khoá **hai hàng khác nhau** nên không hề tranh chấp, cả hai đọc số dư = 1
    dưới READ COMMITTED, cả hai ghi −1. Số dư về −1 và một buổi mua được hai
    ghế.

    Hai lớp đứng chắn, và test khẳng định vào **cả hai**. Số dư cuối cùng là
    việc của lớp sau: constraint trigger đối soát `balance_cached` với
    `SUM(delta)` lúc COMMIT sẽ đánh hỏng transaction thứ hai kể cả khi không ai
    khoá gì. Còn **mã lỗi** là việc của lớp trước: chỉ khi khoá gói thật sự
    được giữ thì người thứ hai mới đọc lại được số dư đã cập nhật và nhận một
    câu 409 nói rõ "hết buổi". Bỏ khoá đi thì kết quả cuối vẫn đúng, nhưng học
    viên nhận một lỗi hệ thống từ tầng CSDL — và test chỉ nhìn số dư sẽ không
    thấy gì.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=1)
    first = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    second = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=2))
    db.commit()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [
            future.result()
            for future in [
                pool.submit(_book_in_own_transaction, user, first.id, student.id),
                pool.submit(_book_in_own_transaction, user, second.id, student.id),
            ]
        ]

    assert sorted(results) == ["INSUFFICIENT_CREDITS", "ok"], results
    assert credit_ledger.balance_of(db, package.id) == 0
    assert _booked(db, first.id) + _booked(db, second.id) == 1
    assert_ledger_is_sound(db)


def test_double_click_creates_one_booking_and_one_deduction(db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=10)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1), capacity=6
    )
    db.commit()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [
            future.result()
            for future in [
                pool.submit(_book_in_own_transaction, user, class_session.id, student.id)
                for _ in range(2)
            ]
        ]

    assert results.count("ok") == 1, results
    assert _booked(db, class_session.id) == 1
    assert credit_ledger.balance_of(db, package.id) == 9
    deducts = db.scalar(
        select(func.count())
        .select_from(CreditLedger)
        .where(CreditLedger.reason_code == LedgerReason.BOOKING_DEDUCT)
    )
    assert deducts == 1
    assert_ledger_is_sound(db)


def test_studio_cancelling_a_class_never_leaves_a_credit_unaccounted(
    db: Session,
) -> None:
    """Studio hủy lớp đúng lúc người cuối đang đặt ghế cuối.

    Hai kết quả đều chấp nhận được — đăng ký bị từ chối, hoặc đăng ký thành
    công rồi được hoàn. Kết quả **không** chấp nhận được là "không cái nào":
    một đăng ký còn sống trên lớp đã hủy, một buổi đã trừ, và không dòng hoàn
    nào.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=10)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1), capacity=1
    )
    db.commit()

    def cancel_class() -> str:
        session = SessionLocal()
        try:
            scheduling.cancel_session(
                session,
                session_id=class_session.id,
                actor_user_id=admin.id,
                reason="HLV báo nghỉ đột xuất",
            )
            session.commit()
            return "ok"
        except Exception as exc:  # noqa: BLE001 — chỉ phân loại kết quả
            session.rollback()
            return type(exc).__name__
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(_book_in_own_transaction, user, class_session.id, student.id),
            pool.submit(cancel_class),
        ]
        [future.result() for future in futures]

    db.expire_all()
    assert db.get(ClassSession, class_session.id).status is SessionStatus.CANCELLED
    assert _booked(db, class_session.id) == 0
    assert credit_ledger.balance_of(db, package.id) == 10
    assert_ledger_is_sound(db)


def test_a_booking_never_holds_the_seat_lock_before_the_credit_lock(
    db: Session, monkeypatch
) -> None:
    """Thứ tự khoá: **gói trước, buổi lớp sau** — khẳng định vào chính phép khoá.

    Thứ tự này là thứ duy nhất ngăn luồng đặt lớp và luồng hủy lớp khoá chéo
    nhau rồi cùng đứng chờ. Nó không để lại dấu vết nào trong dữ liệu cuối
    cùng, nên một test chỉ nhìn kết quả sẽ xanh trên cả bản đảo thứ tự — và
    deadlock sẽ xuất hiện lần đầu trên PROD, ở đúng đường chạy nhiều nhất
    trong ngày.

    Phép đo: ngay sau khi luồng đặt lớp lấy khoá ghế, một kết nối thứ hai thử
    `FOR UPDATE NOWAIT` trên hàng gói. Nó **phải** bị từ chối — nghĩa là khoá
    gói đã nằm trong tay trước đó.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=5)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1)
    )
    db.commit()

    probe: dict[str, object] = {}
    original_booked_count = scheduling.booked_count

    def probing_booked_count(session, session_id):
        # `booked_count` là câu lệnh đầu tiên chạy **sau** khi khoá ghế.
        if "package_locked" not in probe:
            other = SessionLocal()
            try:
                other.execute(
                    text(
                        "SELECT id FROM student_package WHERE id = :pid "
                        "FOR UPDATE NOWAIT"
                    ),
                    {"pid": package.id},
                )
                probe["package_locked"] = False
            except OperationalError:
                probe["package_locked"] = True
            finally:
                other.rollback()
                other.close()
        return original_booked_count(session, session_id)

    monkeypatch.setattr(scheduling, "booked_count", probing_booked_count)
    monkeypatch.setattr(booking_service.scheduling, "booked_count", probing_booked_count)

    with ThreadPoolExecutor(max_workers=1) as pool:
        result = pool.submit(
            _book_in_own_transaction, user, class_session.id, student.id
        ).result()

    assert result == "ok"
    assert probe.get("package_locked") is True, (
        "Luồng đặt lớp đã giữ khoá ghế trong khi hàng gói vẫn tự do — "
        "thứ tự khoá toàn cục bị đảo."
    )


@pytest.mark.parametrize("attempt", range(3))
def test_cancelling_and_booking_in_opposite_order_do_not_deadlock(
    db: Session, attempt: int
) -> None:
    """Hệ quả của thứ tự khoá, đo trên hành vi.

    Hủy lớp đi từ buổi lớp tới gói; đặt lớp đi từ gói tới buổi lớp. Hai chiều
    ngược nhau là công thức deadlock kinh điển, và cả hai đường phải cùng theo
    một thứ tự để nó không xảy ra. Lặp lại vài lần vì deadlock là chuyện xác
    suất — chạy một lần không chứng minh được gì.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    give_package(db, student, admin.id, credits=10)
    sessions = [
        make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=d))
        for d in (1, 2)
    ]
    for class_session in sessions:
        booking_service.book(
            db,
            class_session_id=class_session.id,
            student_id=student.id,
            actor=actor_for(db, user),
        )
    db.commit()

    def cancel(session_id: int) -> str:
        session = SessionLocal()
        try:
            scheduling.cancel_session(
                session,
                session_id=session_id,
                actor_user_id=admin.id,
                reason="Dọn lịch",
            )
            session.commit()
            return "ok"
        except Exception as exc:  # noqa: BLE001 — chỉ phân loại kết quả
            session.rollback()
            return type(exc).__name__
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [
            future.result()
            for future in [pool.submit(cancel, item.id) for item in sessions]
        ]

    assert results == ["ok", "ok"], results
    assert_ledger_is_sound(db)


@pytest.mark.parametrize("attempt", range(3))
def test_two_students_swapping_classes_with_each_other_do_not_deadlock(
    db: Session, attempt: int
) -> None:
    """X đổi lớp 1 → lớp 2 trong khi Y đổi lớp 2 → lớp 1, cùng lúc.

    Đổi lớp chạm **hai** hàng `class_session`. Hai người đổi chéo nhau là công
    thức deadlock kinh điển: mỗi bên giữ hàng mà bên kia đang đợi. Phép khoá
    trước cả hai buổi theo `id` tăng dần là thứ ngăn điều đó — và nó không để
    lại dấu vết nào trong dữ liệu cuối, nên chỉ test này nhìn thấy nó.

    Lặp vài lần vì deadlock là chuyện xác suất; chạy một lần không chứng minh
    được gì.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    first = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1), capacity=2
    )
    second = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=2), capacity=2
    )

    people = []
    for index, class_session in enumerate((first, second)):
        student, user = make_student_account(db, f"Người Đổi {index}")
        give_package(db, student, admin.id, credits=10)
        outcome = booking_service.book(
            db,
            class_session_id=class_session.id,
            student_id=student.id,
            actor=actor_for(db, user),
        )
        people.append((user, outcome.booking.id))
    db.commit()

    def swap(user, booking_id: int, destination: int) -> str:
        session = SessionLocal()
        try:
            actor = actor_for(session, session.merge(user))
            booking_service.change_booking(
                session,
                booking_id=booking_id,
                new_class_session_id=destination,
                actor=actor,
            )
            session.commit()
            return "ok"
        except BusinessError as exc:
            session.rollback()
            return exc.code
        except Exception as exc:  # noqa: BLE001 — chỉ phân loại kết quả
            session.rollback()
            return type(exc).__name__
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [
            future.result()
            for future in [
                pool.submit(swap, people[0][0], people[0][1], second.id),
                pool.submit(swap, people[1][0], people[1][1], first.id),
            ]
        ]

    assert results == ["ok", "ok"], results
    assert _booked(db, first.id) == 1
    assert _booked(db, second.id) == 1
    assert_ledger_is_sound(db)


def test_cancelling_reads_the_class_time_under_a_lock(db: Session, monkeypatch) -> None:
    """Luồng hủy phải **giữ khoá** trên buổi lớp lúc nó quyết định hoàn hay không.

    Khóa chia sẻ phối hợp với các thao tác giữ `FOR UPDATE` trên lớp và được
    lấy sau khóa gói theo thứ tự toàn cục. Studio không có thao tác dời giờ lớp.

    Khẳng định vào chính phép khoá: trong lúc luồng hủy đang quyết định, một kết
    nối khác thử `FOR UPDATE NOWAIT` trên buổi lớp và **phải** bị từ chối.
    """
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    give_package(db, student, admin.id, credits=5)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1)
    )
    outcome = booking_service.book(
        db,
        class_session_id=class_session.id,
        student_id=student.id,
        actor=actor_for(db, user),
    )
    db.commit()
    booking_id = outcome.booking.id

    probe: dict[str, bool] = {}
    original = booking_service.refunds_on_cancel

    def probing_rule(**kwargs):
        # Hàm này chạy ngay sau câu đọc `starts_at` dưới khoá chia sẻ.
        if "locked" not in probe:
            other = SessionLocal()
            try:
                other.execute(
                    text(
                        "SELECT id FROM class_session WHERE id = :sid FOR UPDATE NOWAIT"
                    ),
                    {"sid": class_session.id},
                )
                probe["locked"] = False
            except OperationalError:
                probe["locked"] = True
            finally:
                other.rollback()
                other.close()
        return original(**kwargs)

    monkeypatch.setattr(booking_service, "refunds_on_cancel", probing_rule)

    def cancel() -> str:
        session = SessionLocal()
        try:
            actor = actor_for(session, session.merge(user))
            booking_service.cancel_booking(session, booking_id=booking_id, actor=actor)
            session.commit()
            return "ok"
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=1) as pool:
        assert pool.submit(cancel).result() == "ok"

    assert probe.get("locked") is True, (
        "Luồng hủy đọc giờ học mà không giữ khóa lớp theo thứ tự khóa toàn cục."
    )
