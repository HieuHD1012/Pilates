"""Ghi nhận, xác nhận và huỷ thanh toán (F05)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.content_rules import sanitize_plain_text
from app.core.errors import NotFoundError
from app.core.permissions import Actor, require_staff
from app.db import get_db
from app.domain.rules import PaymentStatus
from app.models.money import Payment, StudentPackage
from app.schemas.money import (
    PaymentResponse,
    RecordPaymentRequest,
    VoidPaymentRequest,
)
from app.services import payments as payment_service

router = APIRouter(prefix="/payments", tags=["payments"], dependencies=[Depends(require_staff)])


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    db: Session = Depends(get_db),
    student_package_id: int | None = None,
    student_id: int | None = None,
    status: PaymentStatus | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Payment]:
    """Danh sách giao dịch thanh toán."""
    stmt = select(Payment).order_by(Payment.recorded_at.desc(), Payment.id.desc())
    if student_package_id is not None:
        stmt = stmt.where(Payment.student_package_id == student_package_id)
    if student_id is not None:
        stmt = stmt.join(
            StudentPackage, StudentPackage.id == Payment.student_package_id
        ).where(StudentPackage.student_id == student_id)
    if status is not None:
        stmt = stmt.where(Payment.status == status)
    return list(db.scalars(stmt.limit(limit).offset(offset)))


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db)) -> Payment:
    """Chi tiết một giao dịch thanh toán."""
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Không tìm thấy giao dịch thanh toán.")
    return payment


@router.post("", response_model=PaymentResponse, status_code=201)
def record_payment(
    payload: RecordPaymentRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Payment:
    """Ghi nhận một khoản thu, mặc định ở trạng thái chờ xác nhận.

    Buổi đã được cộng từ lúc bán gói, không đợi bước này.
    """
    return payment_service.record_payment(
        db,
        student_package_id=payload.student_package_id,
        amount=payload.amount,
        method=payload.method,
        actor_user_id=actor.id,
        note=sanitize_plain_text(payload.note, 500, "note"),
    )


@router.post("/{payment_id}/confirm", response_model=PaymentResponse)
def confirm_payment(
    payment_id: int,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Payment:
    """Xác nhận đã nhận tiền. Chỉ `CONFIRMED` mới vào báo cáo doanh thu."""
    return payment_service.confirm_payment(
        db, payment_id=payment_id, actor_user_id=actor.id
    )


@router.post("/{payment_id}/void", response_model=PaymentResponse)
def void_payment(
    payment_id: int,
    payload: VoidPaymentRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Payment:
    """Huỷ giao dịch — bị chặn nếu gói đã tiêu buổi.

    Trả 409 nêu rõ đã tiêu bao nhiêu buổi, để nhân viên biết phải xử lý bằng
    điều chỉnh số buổi thủ công chứ không phải thử lại.
    """
    return payment_service.void_payment(
        db,
        payment_id=payment_id,
        actor_user_id=actor.id,
        reason=sanitize_plain_text(payload.reason, 500, "reason") or "",
    )
