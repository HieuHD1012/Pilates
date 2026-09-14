"""Lịch của học viên.

Tách khỏi `/bookings` vì phạm vi ở đây **ghim theo chủ sở hữu ngay trong câu
truy vấn**, không nhận `student_id` tuỳ ý rồi lọc sau. Lọc sau là cách lịch của
học viên này rò sang học viên khác qua một tham số đoán được.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ValidationError
from app.core.permissions import Actor, assert_can_read_student, get_current_actor
from app.db import get_db
from app.domain.rules import (
    HELD_BOOKING_STATUSES,
    TIMEZONE,
    BookingStatus,
    SessionStatus,
    cancel_deadline,
    now,
)
from app.models.money import StudentPackage
from app.models.people import Trainer
from app.models.scheduling import Booking, ClassSession
from app.schemas.booking import MyScheduleItem
from app.services import booking_service, credit_balance

router = APIRouter(tags=["my-schedule"])


def _resolve_target(actor: Actor, student_id: int | None) -> int:
    """Học viên đang được xem.

    Tài khoản không phải học viên mà không khai `student_id` thì báo lỗi chứ
    không rơi vào một id mặc định nào — mặc định ở đây là cách trả nhầm lịch
    của người khác.
    """
    if student_id is not None:
        return student_id
    if actor.student_id is None:
        raise ValidationError("Cần khai rõ học viên muốn xem lịch.", "STUDENT_REQUIRED")
    return actor.student_id


@router.get("/my-schedule", response_model=list[MyScheduleItem])
def my_schedule(
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    student_id: int | None = None,
    starts_from: datetime | None = None,
    starts_to: datetime | None = None,
    include_cancelled: bool = False,
    limit: int = Query(default=200, ge=1, le=500),
) -> list[MyScheduleItem]:
    """Các buổi lớp của một học viên, kèm **hậu quả của việc hủy ngay bây giờ**.

    `student_id` chỉ dành cho nhân viên xem tab lịch sử lớp ở hồ sơ học viên;
    `assert_can_read_student` là chỗ quyết định ai xem được của ai.
    """
    target = _resolve_target(actor, student_id)
    assert_can_read_student(actor, target)

    stmt = (
        select(Booking, ClassSession, Trainer.full_name)
        .join(ClassSession, ClassSession.id == Booking.class_session_id)
        .join(Trainer, Trainer.id == ClassSession.trainer_id)
        .where(Booking.student_id == target)
        .order_by(ClassSession.starts_at, Booking.id)
        .limit(limit)
    )
    if not include_cancelled:
        stmt = stmt.where(
            Booking.status.in_(HELD_BOOKING_STATUSES)
        )
    if starts_from is not None:
        stmt = stmt.where(ClassSession.starts_at >= starts_from)
    if starts_to is not None:
        stmt = stmt.where(ClassSession.starts_at < starts_to)

    at = now()
    return [
        _schedule_item(booking, class_session, trainer_name, at)
        for booking, class_session, trainer_name in db.execute(stmt).all()
    ]


def _schedule_item(
    booking: Booking, class_session: ClassSession, trainer_name: str, at: datetime
) -> MyScheduleItem:
    """Một dòng lịch, kèm hậu quả của việc hủy ngay bây giờ.

    `can_cancel` và `refund_if_cancelled_now` cố ý là **cùng một giá trị**: sau
    hạn hủy thì thao tác bị khóa chứ không phải "hủy được nhưng mất buổi". Tính
    một lần rồi dùng hai chỗ, để hai trường không thể lệch nhau về sau.

    Giá trị đó đến từ `refunds_on_cancel` — đúng hàm mà luồng hủy dùng. Viết lại
    biểu thức ở đây là tạo ra một lời hứa có thể lệch với thứ thật sự xảy ra khi
    học viên bấm.
    """
    refundable = booking.status is BookingStatus.BOOKED and booking_service.refunds_on_cancel(
        starts_at=class_session.starts_at,
        class_type=class_session.class_type,
        at=at,
    )
    return MyScheduleItem(
        booking_id=booking.id,
        class_session_id=class_session.id,
        starts_at=class_session.starts_at,
        ends_at=class_session.ends_at,
        class_type=class_session.class_type,
        trainer_name=trainer_name,
        session_status=class_session.status,
        booking_status=booking.status,
        cancel_deadline=cancel_deadline(class_session.starts_at, class_session.class_type),
        refund_if_cancelled_now=refundable,
        can_cancel=refundable,
    )


@router.get("/my-schedule/bookable", response_model=list[int])
def bookable_sessions(
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    student_id: int | None = None,
    starts_to: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=300),
) -> list[int]:
    """Id các buổi lớp học viên **thực sự đăng ký được bằng gói đang có**.

    Danh sách lớp của học viên chỉ nên hiện những buổi này. Lọc bằng loại gói
    ở phía giao diện là một bản sao thứ hai của quy tắc chọn gói, và bản sao
    thứ hai luôn là bản sẽ lệch.
    """

    target = _resolve_target(actor, student_id)
    assert_can_read_student(actor, target)

    at = now()
    session_date = func.date(func.timezone(TIMEZONE.key, ClassSession.starts_at))
    usable_package = (
        credit_balance.active_package_filter(select(StudentPackage.id))
        .where(
            StudentPackage.student_id == target,
            StudentPackage.class_type_snapshot == ClassSession.class_type,
            StudentPackage.start_date <= session_date,
            StudentPackage.end_date >= session_date,
        )
        .correlate(ClassSession)
        .exists()
    )
    booked_count = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.class_session_id == ClassSession.id,
            Booking.status.in_(HELD_BOOKING_STATUSES),
        )
        .correlate(ClassSession)
        .scalar_subquery()
    )
    stmt = (
        select(ClassSession.id)
        .where(
            ClassSession.status == SessionStatus.SCHEDULED,
            ClassSession.starts_at > at,
            usable_package,
            booked_count < ClassSession.capacity,
        )
        .order_by(ClassSession.starts_at, ClassSession.id)
        .limit(limit)
    )
    if starts_to is not None:
        stmt = stmt.where(ClassSession.starts_at < starts_to)

    booked = select(Booking.class_session_id).where(
        Booking.student_id == target, Booking.status == BookingStatus.BOOKED
    )
    stmt = stmt.where(ClassSession.id.not_in(booked))
    return list(db.scalars(stmt))
