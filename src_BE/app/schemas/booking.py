"""Schema cho đăng ký, hủy, đổi lớp và điểm danh."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.rules import BookingStatus, ClassType, SessionStatus


class BookingCreate(BaseModel):
    class_session_id: int
    #: Bỏ trống nghĩa là chính tôi; không được truyền hồ sơ người khác.
    student_id: int | None = None
    #: Bỏ trống thì hệ thống chọn gói đang hoạt động có `end_date` sớm nhất.
    student_package_id: int | None = None


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_session_id: int
    student_id: int
    student_package_id: int
    status: BookingStatus
    created_at: datetime


class BookingResult(BaseModel):
    booking: BookingResponse
    student_package_id: int
    credits_remaining: int


class AttendanceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal[BookingStatus.ATTENDED, BookingStatus.NO_SHOW]


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_session_id: int
    student_id: int
    status: BookingStatus
    attendance_marked_by: int | None
    attendance_marked_at: datetime | None


class AttendanceRosterItem(AttendanceResponse):
    student_name: str


class CancelBookingRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)


class CancelBookingResult(BaseModel):
    """`refunded` là dữ liệu, không phải màu sắc.

    Giao diện phải nói bằng chữ học viên có được hoàn buổi hay không; gửi kèm
    số dư sau thao tác để màn hình không phải tự suy ra.
    """

    booking_id: int
    status: BookingStatus
    refunded: bool
    credits_remaining: int


class ChangeBookingRequest(BaseModel):
    new_class_session_id: int
    student_package_id: int | None = None


class ChangeBookingResult(BaseModel):
    cancelled: CancelBookingResult
    booked: BookingResult


class MyScheduleItem(BaseModel):
    """Một dòng trong "Lịch của tôi".

    `can_cancel` quyết định quyền hủy; sau hạn khóa thao tác.
    `cancel_deadline` là hạn hủy và `refund_if_cancelled_now` cho biết hoàn buổi.
    """

    booking_id: int
    class_session_id: int
    starts_at: datetime
    ends_at: datetime
    class_type: ClassType
    trainer_name: str
    session_status: SessionStatus
    booking_status: BookingStatus
    cancel_deadline: datetime
    refund_if_cancelled_now: bool
    can_cancel: bool
