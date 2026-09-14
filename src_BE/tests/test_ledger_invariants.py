"""Bảy bất biến của sổ buổi (F05).

Mỗi bất biến có **hai** test: một khẳng định nó xanh trên dữ liệu đúng, một
**test âm** dựng dữ liệu sai rồi chứng minh nó đỏ.

Vế thứ hai là vế quan trọng. Bản đối soát trước của dự án khẳng định
"số dư = `SUM(delta)`" trong khi số dư *được định nghĩa* là `SUM(delta)` —
luôn xanh, kể cả trên CSDL hỏng hoàn toàn, rồi được nâng lên thành tiêu chí
nghiệm thu số 1. Một bất biến chưa ai thấy đỏ là một bất biến chưa biết có
hoạt động hay không.

Dữ liệu sai được dựng bằng SQL thô, có tắt trigger ở chỗ cần: mục đích là mô
phỏng một CSDL **đã hỏng** để xem phép đối soát có phát hiện ra không.
"""

from __future__ import annotations

from collections.abc import Sequence
from contextlib import contextmanager
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.domain.rules import (
    BookingStatus,
    ClassType,
    LedgerReason,
    PackageStatus,
    Role,
    SessionStatus,
    now,
    today,
)
from app.models.money import StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession
from app.services import credit_ledger
from app.services.ledger_invariants import (
    INVARIANTS,
    assert_ledger_is_sound,
    check_invariants,
    invariant_codes,
)
from app.services.package_sales import PackageSpec, sell_package
from tests.conftest import make_user


@pytest.fixture
def world(db: Session) -> dict:
    """Một studio nhỏ với một gói đã bán và một lượt đăng ký đã trừ buổi."""
    admin = make_user(db, Role.ADMIN)
    student = Student(full_name="Học viên Demo 01", phone="0900000001")
    trainer = Trainer(full_name="HLV Demo 01")
    db.add_all([student, trainer])
    db.flush()

    package = sell_package(
        db,
        student_id=student.id,
        spec=PackageSpec(
            name="Gói Demo 10 buổi",
            price=Decimal("2500000.00"),
            credits=10,
            class_type=ClassType.GROUP,
            start_date=today() - timedelta(days=1),
            end_date=today() + timedelta(days=89),
        ),
        actor_user_id=admin.id,
    )

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

    return {
        "admin": admin,
        "student": student,
        "trainer": trainer,
        "package": package,
        "class_session": class_session,
        "booking": booking,
    }


def _violated_codes(db: Session) -> set[str]:
    return {item.code for item in check_invariants(db)}


@contextmanager
def corrupted(db: Session, sql: str, *, drop: Sequence[str] = (), **params):
    """Dựng một CSDL **đã hỏng**, kiểm phép đối soát, rồi rollback sạch.

    Toàn bộ chạy trong một transaction không bao giờ commit. PostgreSQL có DDL
    giao dịch nên cả ràng buộc bị gỡ tạm lẫn dữ liệu sai đều biến mất khi thoát
    — không test nào sau đó chạy trên schema yếu hơn.

    Phải gỡ ràng buộc vì chúng chặt tới mức trạng thái hỏng không dựng nổi từ
    bên ngoài; nhưng script đối soát ở F10 chạy trên PROD, nơi dữ liệu còn đến
    từ nhập liệu và từ những lần sửa tay có tắt trigger. Nó phải nhìn ra hỏng
    hóc bất kể hỏng bằng đường nào.
    """
    db.execute(text("ALTER TABLE credit_ledger DISABLE TRIGGER USER"))
    db.execute(text("ALTER TABLE student_package DISABLE TRIGGER USER"))
    for ddl in drop:
        db.execute(text(ddl))
    db.execute(text(sql), params)
    try:
        yield
    finally:
        db.rollback()


# --- Dữ liệu đúng thì cả bảy mệnh đề xanh ------------------------------------


def test_all_invariants_hold_on_sound_data(db: Session, world: dict) -> None:
    assert check_invariants(db) == []
    assert_ledger_is_sound(db)


def test_invariant_set_is_complete(db: Session) -> None:
    """Đúng bảy mệnh đề, đúng bảy mã — khớp với `docs/business-rules.md`."""
    assert len(INVARIANTS) == 7
    assert len(set(invariant_codes())) == 7


def test_empty_database_is_sound(db: Session) -> None:
    assert check_invariants(db) == []


# --- Test âm: mỗi mệnh đề phải fail được -------------------------------------


def test_1_detects_balance_drifting_from_ledger(db: Session, world: dict) -> None:
    """`balance_cached` lệch `SUM(delta)`.

    Đây là mệnh đề duy nhất có nghĩa nhờ việc `balance_cached` là biểu diễn
    **thứ hai độc lập**. Không có nó, phép so trở thành `SUM(delta)` với chính
    nó và không bao giờ đỏ được.
    """
    with corrupted(
        db,
        "UPDATE student_package SET balance_cached = balance_cached + 5 WHERE id = :i",
        i=world["package"].id,
    ):
        assert "LEDGER_1_BALANCE_MATCHES_SUM" in _violated_codes(db)


def test_2_detects_negative_balance(db: Session, world: dict) -> None:
    with corrupted(
        db,
        """
        INSERT INTO credit_ledger
            (student_package_id, delta, reason_code, note, actor_user_id, created_at)
        VALUES (:i, -99, 'ADMIN_ADJUST', 'Dựng dữ liệu hỏng', :a, now())
        """,
        i=world["package"].id,
        a=world["admin"].id,
    ):
        assert "LEDGER_2_NO_NEGATIVE_BALANCE" in _violated_codes(db)


def test_3_detects_booking_without_deduction(db: Session, world: dict) -> None:
    """Một lượt đăng ký đang hoạt động mà không có dòng trừ buổi.

    Nghĩa là có người giữ chỗ mà không trả buổi nào — lớp đầy dần trong khi sổ
    không ghi nhận gì.
    """
    with corrupted(
        db,
        "DELETE FROM credit_ledger WHERE booking_id = :b AND reason_code = 'BOOKING_DEDUCT'",
        b=world["booking"].id,
    ):
        violated = _violated_codes(db)
    assert "LEDGER_3_ONE_DEDUCT_PER_ACTIVE_BOOKING" in violated
    assert "LEDGER_5_BOOKING_ENTRIES_HAVE_A_BOOKING" in violated


def test_3_detects_double_deduction_for_one_booking(db: Session, world: dict) -> None:
    with corrupted(
        db,
        """
        INSERT INTO credit_ledger
            (student_package_id, delta, reason_code, booking_id, actor_user_id, created_at)
        VALUES (:i, -1, 'BOOKING_DEDUCT', :b, :a, now())
        """,
        drop=["DROP INDEX uq_credit_ledger_booking_deduct_per_booking"],
        i=world["package"].id,
        b=world["booking"].id,
        a=world["admin"].id,
    ):
        assert "LEDGER_3_ONE_DEDUCT_PER_ACTIVE_BOOKING" in _violated_codes(db)


def test_3_detects_deduction_charged_to_the_wrong_package(
    db: Session, world: dict
) -> None:
    """Dòng trừ buổi trỏ đúng lượt đăng ký nhưng sai gói."""
    other = StudentPackage(
        student_id=world["student"].id,
        name_snapshot="Gói thứ hai",
        price_snapshot=Decimal("1000000.00"),
        credits_snapshot=5,
        class_type_snapshot=ClassType.GROUP,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        status=PackageStatus.ACTIVE,
        balance_cached=0,
    )
    db.add(other)
    db.flush()
    credit_ledger.record(
        db,
        student_package_id=other.id,
        delta=5,
        reason=LedgerReason.PACKAGE_SOLD,
        actor_user_id=world["admin"].id,
    )
    db.commit()

    with corrupted(
        db,
        """
        UPDATE credit_ledger SET student_package_id = :other
         WHERE booking_id = :b AND reason_code = 'BOOKING_DEDUCT'
        """,
        other=other.id,
        b=world["booking"].id,
    ):
        assert "LEDGER_3_ONE_DEDUCT_PER_ACTIVE_BOOKING" in _violated_codes(db)


def test_4_detects_double_refund(db: Session, world: dict) -> None:
    """Hoàn buổi hai lần cho cùng một lượt đăng ký.

    Kịch bản thật: học viên hủy sớm, mạng chập chờn, giao diện gửi lại — trả
    một buổi, nhận về hai, lặp lại được vô hạn.
    """
    with corrupted(
        db,
        """
        INSERT INTO credit_ledger
            (student_package_id, delta, reason_code, booking_id, actor_user_id, created_at)
        VALUES (:i, 1, 'CANCEL_REFUND', :b, :a, now()),
               (:i, 1, 'CANCEL_REFUND', :b, :a, now())
        """,
        drop=["DROP INDEX uq_credit_ledger_cancel_refund_per_booking"],
        i=world["package"].id,
        b=world["booking"].id,
        a=world["admin"].id,
    ):
        assert "LEDGER_4_AT_MOST_ONE_REFUND_PER_BOOKING" in _violated_codes(db)


def test_5_detects_deduction_pointing_nowhere(db: Session, world: dict) -> None:
    with corrupted(
        db,
        """
        INSERT INTO credit_ledger
            (student_package_id, delta, reason_code, booking_id, actor_user_id, created_at)
        VALUES (:i, -1, 'BOOKING_DEDUCT', NULL, :a, now())
        """,
        drop=[
            "ALTER TABLE credit_ledger "
            "DROP CONSTRAINT ck_credit_ledger_booking_reason_needs_booking"
        ],
        i=world["package"].id,
        a=world["admin"].id,
    ):
        assert "LEDGER_5_BOOKING_ENTRIES_HAVE_A_BOOKING" in _violated_codes(db)


def test_6_detects_a_consumption_entry_with_a_positive_delta(
    db: Session, world: dict
) -> None:
    """Bút toán tiêu buổi mang dấu dương.

    `BOOKING_DEDUCT` và `PAYMENT_VOID` chỉ được làm **giảm** số dư. Một dòng
    mang dấu dương nghĩa là buổi "mọc ra" từ một lý do vốn để trừ đi — không
    đường code nào sinh ra được, nên nếu thấy thì dữ liệu đã bị sửa từ ngoài.
    """
    with corrupted(
        db,
        """
        INSERT INTO credit_ledger
            (student_package_id, delta, reason_code, actor_user_id, created_at)
        VALUES (:i, 50, 'PAYMENT_VOID', :a, now())
        """,
        i=world["package"].id,
        a=world["admin"].id,
    ):
        assert "LEDGER_6_CONSUMPTION_ENTRIES_ARE_NEGATIVE" in _violated_codes(db)


def test_7_detects_entry_charged_to_another_students_package(
    db: Session, world: dict
) -> None:
    """Bút toán trừ vào gói của học viên khác.

    Đây là **kiểu gian lận duy nhất mà phép đối soát tổng mù hoàn toàn**: học
    viên A truyền `student_package_id` của B, booking ghi cho A còn buổi trừ
    vào gói của B. Dòng ledger vẫn là dòng thật, `SUM(delta)` vẫn khớp, và
    không mệnh đề nào khác thấy gì. B âm thầm mất buổi.
    """
    admin = world["admin"]
    victim = Student(full_name="Học viên Demo 02", phone="0900000002")
    db.add(victim)
    db.flush()
    victim_package = StudentPackage(
        student_id=victim.id,
        name_snapshot="Gói của người khác",
        price_snapshot=Decimal("2500000.00"),
        credits_snapshot=10,
        class_type_snapshot=ClassType.GROUP,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        status=PackageStatus.ACTIVE,
        balance_cached=0,
    )
    db.add(victim_package)
    db.flush()
    credit_ledger.record(
        db,
        student_package_id=victim_package.id,
        delta=10,
        reason=LedgerReason.PACKAGE_SOLD,
        actor_user_id=admin.id,
    )
    db.commit()

    with corrupted(
        db,
        """
        INSERT INTO credit_ledger
            (student_package_id, delta, reason_code, booking_id, actor_user_id, created_at)
        VALUES (:victim_pkg, -1, 'BOOKING_DEDUCT', :b, :a, now())
        """,
        drop=["DROP INDEX uq_credit_ledger_booking_deduct_per_booking"],
        victim_pkg=victim_package.id,
        b=world["booking"].id,
        a=admin.id,
    ):
        assert "LEDGER_7_ENTRY_PACKAGE_BELONGS_TO_BOOKING_STUDENT" in _violated_codes(db)


# --- Bất biến vẫn xanh sau các luồng nghiệp vụ thật --------------------------


def test_invariants_hold_after_class_cancellation(db: Session, world: dict) -> None:
    from app.services import scheduling

    scheduling.cancel_session(
        db,
        session_id=world["class_session"].id,
        actor_user_id=world["admin"].id,
        reason="HLV nghỉ ốm.",
    )
    db.commit()

    assert_ledger_is_sound(db)
    assert world["class_session"].status is SessionStatus.CANCELLED


def test_invariants_hold_after_renewal_and_adjustment(db: Session, world: dict) -> None:
    from app.services import package_sales

    package_sales.renew_package(
        db,
        student_package_id=world["package"].id,
        extra_days=30,
        extra_credits=5,
        actor_user_id=world["admin"].id,
    )
    package_sales.adjust_credits(
        db,
        student_package_id=world["package"].id,
        delta=-2,
        reason_note="Thu lại buổi cộng nhầm.",
        actor_user_id=world["admin"].id,
    )
    db.commit()
    assert_ledger_is_sound(db)
