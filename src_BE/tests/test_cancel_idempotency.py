"""Hủy đăng ký phải idempotent.

Kịch bản thật: học viên hủy sớm 6 giờ, mạng chập chờn, giao diện thử lại — hoặc
người dùng bấm hai lần. Hai request, cả hai thấy `BOOKED`, cả hai ghi
`CANCEL_REFUND +1`. Trả một buổi, nhận về hai, và lặp lại được vô hạn.

Hai lớp chặn, và cả hai đều được kiểm ở đây: câu `UPDATE ... WHERE
status = 'BOOKED'` kèm `rowcount`, và partial unique index trên
`credit_ledger(booking_id) WHERE reason_code = 'CANCEL_REFUND'`.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.db import SessionLocal
from app.domain.rules import LedgerReason, Role, now
from app.models.money import CreditLedger
from app.services import booking_service, credit_ledger
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import make_user
from tests.factories import (
    actor_for,
    give_package,
    make_session,
    make_student_account,
    make_trainer,
)


def _refund_rows(db: Session, booking_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(CreditLedger)
            .where(
                CreditLedger.booking_id == booking_id,
                CreditLedger.reason_code == LedgerReason.CANCEL_REFUND,
            )
        )
    )


@pytest.fixture
def booked(db: Session):
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, student_user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=10)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1)
    )
    actor = actor_for(db, student_user)
    outcome = booking_service.book(
        db,
        class_session_id=class_session.id,
        student_id=student.id,
        actor=actor,
    )
    db.commit()
    return {
        "admin": admin,
        "actor": actor,
        "package": package,
        "booking_id": outcome.booking.id,
    }


def test_second_cancel_is_refused_and_refunds_nothing(db: Session, booked) -> None:
    booking_service.cancel_booking(
        db, booking_id=booked["booking_id"], actor=booked["actor"]
    )
    db.commit()

    with pytest.raises(BusinessError) as exc:
        booking_service.cancel_booking(
            db, booking_id=booked["booking_id"], actor=booked["actor"]
        )
    assert exc.value.code == "BOOKING_NOT_ACTIVE"
    db.rollback()

    assert _refund_rows(db, booked["booking_id"]) == 1
    assert credit_ledger.balance_of(db, booked["package"].id) == 10
    assert_ledger_is_sound(db)


def test_double_click_cancel_refunds_exactly_one_credit(db: Session, booked) -> None:
    """Hai request hủy **đồng thời**, mỗi cái một transaction thật.

    Fixture `db` dùng chung một session nên không mô phỏng được tình huống này;
    phải mở hai kết nối riêng, nếu không test đang đo một hệ thống không tồn
    tại.
    """
    booking_id = booked["booking_id"]
    actor_user = booked["actor"].user
    package_id = booked["package"].id

    def cancel() -> str:
        session = SessionLocal()
        try:
            actor = actor_for(session, session.merge(actor_user))
            booking_service.cancel_booking(
                session, booking_id=booking_id, actor=actor
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
        results = [future.result() for future in [pool.submit(cancel), pool.submit(cancel)]]

    assert results.count("ok") == 1, results
    assert _refund_rows(db, booking_id) == 1
    assert credit_ledger.balance_of(db, package_id) == 10
    assert_ledger_is_sound(db)


def test_database_refuses_a_second_refund_row(db: Session, booked) -> None:
    """Lớp chặn thứ hai, độc lập với logic ở tầng service.

    Nếu một ngày `cancel_booking` mất điều kiện `WHERE status = 'BOOKED'` thì
    index này là thứ duy nhất còn đứng giữa một lần bấm nhầm và một buổi tập
    được trả hai lần.
    """
    booking_service.cancel_booking(
        db, booking_id=booked["booking_id"], actor=booked["actor"]
    )
    db.commit()

    db.add(
        CreditLedger(
            student_package_id=booked["package"].id,
            delta=1,
            reason_code=LedgerReason.CANCEL_REFUND,
            booking_id=booked["booking_id"],
            actor_user_id=booked["admin"].id,
            note="Dòng hoàn thứ hai",
        )
    )
    with pytest.raises(IntegrityError) as exc:
        db.flush()
    assert "uq_credit_ledger_cancel_refund_per_booking" in str(exc.value.orig)
    db.rollback()
