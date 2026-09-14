"""Học viên tự đăng ký, hủy và đổi lớp; HLV điểm danh sau lớp."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ValidationError
from app.core.permissions import Actor, require_staff, require_student, require_trainer
from app.db import get_db
from app.domain.rules import HELD_BOOKING_STATUSES, BookingStatus, Role, as_studio_time
from app.models.scheduling import Booking, ClassSession
from app.schemas.booking import (
    AttendanceRequest,
    AttendanceResponse,
    BookingCreate,
    BookingResponse,
    BookingResult,
    CancelBookingRequest,
    CancelBookingResult,
    ChangeBookingRequest,
    ChangeBookingResult,
)
from app.services import attendance, booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


def resolve_student_id(actor: Actor, requested: int | None) -> int:
    """Bỏ student_id để dùng hồ sơ của tài khoản học viên hiện tại."""
    if requested is not None:
        return requested
    if actor.role is Role.STUDENT and actor.student_id is not None:
        return actor.student_id
    raise ValidationError("Tài khoản học viên chưa được nối với hồ sơ.", "STUDENT_REQUIRED")


def _result(outcome: booking_service.BookingOutcome) -> BookingResult:
    return BookingResult(
        booking=BookingResponse.model_validate(outcome.booking),
        student_package_id=outcome.student_package_id,
        credits_remaining=outcome.credits_remaining,
    )


def _cancel_result(
    outcome: booking_service.CancelBookingOutcome,
) -> CancelBookingResult:
    return CancelBookingResult(
        booking_id=outcome.booking_id,
        status=outcome.status,
        refunded=outcome.refunded,
        credits_remaining=outcome.credits_remaining,
    )


@router.post("", response_model=BookingResult, status_code=201)
def create_booking(
    payload: BookingCreate,
    actor: Actor = Depends(require_student),
    db: Session = Depends(get_db),
) -> BookingResult:
    """Học viên tự đăng ký: thành công thì BOOKED và trừ ngay 1 buổi."""
    outcome = booking_service.book(
        db,
        class_session_id=payload.class_session_id,
        student_id=resolve_student_id(actor, payload.student_id),
        actor=actor,
        student_package_id=payload.student_package_id,
    )
    return _result(outcome)


@router.post("/{booking_id}/cancel", response_model=CancelBookingResult)
def cancel_booking(
    booking_id: int,
    payload: CancelBookingRequest | None = None,
    actor: Actor = Depends(require_student),
    db: Session = Depends(get_db),
) -> CancelBookingResult:
    """Hủy một đăng ký.

    Idempotent: gọi lại trên đăng ký đã hủy không trừ hay hoàn thêm lần nào.
    Hủy đúng hạn hoàn 1 buổi. Sau hạn trả CANCELLATION_CLOSED,
    giữ nguyên đăng ký và số buổi. Group 4 giờ, Private/Duo 1 giờ.
    """
    outcome = booking_service.cancel_booking(
        db,
        booking_id=booking_id,
        actor=actor,
        note=payload.note if payload else None,
    )
    return _cancel_result(outcome)


@router.post("/{booking_id}/change", response_model=ChangeBookingResult)
def change_booking(
    booking_id: int,
    payload: ChangeBookingRequest,
    actor: Actor = Depends(require_student),
    db: Session = Depends(get_db),
) -> ChangeBookingResult:
    """Đổi sang buổi lớp khác — hủy buổi cũ và đặt buổi mới trong một giao dịch.

    Hoặc đổi được cả hai, hoặc không đổi gì. Buổi cũ quá hạn hủy thì
    từ chối đổi với CANCELLATION_CLOSED. Gói phải còn hạn vào ngày lớp mới.
    """
    outcome = booking_service.change_booking(
        db,
        booking_id=booking_id,
        new_class_session_id=payload.new_class_session_id,
        actor=actor,
        student_package_id=payload.student_package_id,
    )
    return ChangeBookingResult(
        cancelled=_cancel_result(outcome.cancelled), booked=_result(outcome.booked)
    )


@router.patch("/{booking_id}/attendance", response_model=AttendanceResponse)
def mark_attendance(
    booking_id: int,
    payload: AttendanceRequest,
    actor: Actor = Depends(require_trainer),
    db: Session = Depends(get_db),
) -> Booking:
    """HLV điểm danh sau ends_at: ATTENDED hoặc NO_SHOW, không đổi số buổi.

    Chỉ HLV đang được gán lớp. Cho sửa nhầm giữa hai trạng thái;
    lưu người và thời điểm cập nhật gần nhất. Gửi lặp cùng trạng thái không đổi audit.
    Lượt đã điểm danh không còn được hủy/đổi lớp.
    """
    return attendance.mark_attendance(db, booking_id=booking_id, status=payload.status, actor=actor)


@router.get("", response_model=list[BookingResponse])
def list_bookings(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    class_session_id: int | None = None,
    student_id: int | None = None,
    status: BookingStatus | None = None,
    held_only: bool = False,
    starts_from: datetime | None = None,
    starts_to: datetime | None = None,
    limit: int = Query(default=200, ge=1, le=500),
) -> list[Booking]:
    """Danh sách đăng ký cho nhân viên quản lý.

    Học viên không đi qua đây — họ đọc `/my-schedule`, nơi phạm vi đã bị ghim
    vào chính họ. Một endpoint chung có tham số `student_id` là chỗ dễ quên
    ghim nhất.
    """
    stmt = (
        select(Booking)
        .join(ClassSession, ClassSession.id == Booking.class_session_id)
        .order_by(ClassSession.starts_at.desc(), Booking.id.desc())
        .limit(limit)
    )
    # Lọc theo **giờ của buổi lớp**, không theo lúc bấm đặt: bảng tổng hợp đếm
    # số ghế của các lớp diễn ra trong kỳ, và con số đó phải mở ra được đúng
    # các dòng tạo nên nó.
    starts_from = as_studio_time(starts_from)
    starts_to = as_studio_time(starts_to)
    if starts_from is not None:
        stmt = stmt.where(ClassSession.starts_at >= starts_from)
    if starts_to is not None:
        stmt = stmt.where(ClassSession.starts_at < starts_to)
    if class_session_id is not None:
        stmt = stmt.where(Booking.class_session_id == class_session_id)
    if student_id is not None:
        stmt = stmt.where(Booking.student_id == student_id)
    if held_only:
        stmt = stmt.where(
            Booking.status.in_(HELD_BOOKING_STATUSES)
        )
    if status is not None:
        stmt = stmt.where(Booking.status == status)
    return list(db.scalars(stmt))
