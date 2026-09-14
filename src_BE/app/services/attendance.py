"""HLV điểm danh lớp mình dạy sau khi kết thúc; sổ buổi giữ nguyên."""

from datetime import UTC

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ForbiddenError, NotFoundError
from app.core.permissions import Actor
from app.domain.rules import HELD_BOOKING_STATUSES, BookingStatus, Role, SessionStatus, now
from app.models.scheduling import Booking, ClassSession


def mark_attendance(
    db: Session, *, booking_id: int, status: BookingStatus, actor: Actor
) -> Booking:
    if actor.role is not Role.TRAINER or actor.trainer_id is None:
        raise ForbiddenError("Chỉ HLV phụ trách lớp được điểm danh.")
    if status not in (BookingStatus.ATTENDED, BookingStatus.NO_SHOW):
        raise BusinessError("INVALID_ATTENDANCE_STATUS", "Chỉ chọn đã đến lớp hoặc vắng mặt.")
    session_id = db.scalar(select(Booking.class_session_id).where(Booking.id == booking_id))
    if session_id is None:
        raise NotFoundError("Không tìm thấy lượt đăng ký.")

    # Cùng khóa lớp với dời giờ/đổi HLV/hủy lớp, rồi mới khóa booking.
    # Điểm danh không khóa gói và không ghi ledger.
    class_session = db.scalar(
        select(ClassSession)
        .where(ClassSession.id == session_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if class_session.trainer_id != actor.trainer_id:
        raise ForbiddenError("Bạn chỉ điểm danh được lớp mình dạy.")
    if class_session.status is SessionStatus.CANCELLED:
        raise BusinessError("SESSION_CANCELLED", "Không điểm danh lớp đã hủy.")
    at = now()
    if class_session.ends_at > at:
        raise BusinessError("SESSION_NOT_FINISHED", "Chỉ điểm danh sau khi lớp kết thúc.")
    booking = db.scalar(
        select(Booking)
        .where(Booking.id == booking_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if booking.status not in HELD_BOOKING_STATUSES:
        raise BusinessError("BOOKING_NOT_ACTIVE", "Không điểm danh lượt đăng ký đã hủy.")
    # Gửi lặp cùng trạng thái giữ nguyên audit; sửa nhầm cập nhật audit mới nhất.
    if booking.status is not status:
        booking.status = status
        booking.attendance_marked_by = actor.id
        booking.attendance_marked_at = at.astimezone(UTC)
        db.flush()
    return booking
