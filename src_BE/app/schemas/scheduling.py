"""Schema cho lớp và lịch học."""

from __future__ import annotations

from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.domain.rules import ClassType, SessionStatus


class ClassSessionCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    trainer_id: int
    class_type: ClassType
    #: Bắt buộc với Group. Private mặc định 1; đặt 2 cho lớp Duo.
    capacity: int | None = Field(default=None, ge=1)


class ClassSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    starts_at: datetime
    ends_at: datetime
    trainer_id: int
    class_type: ClassType
    capacity: int
    status: SessionStatus
    recurrence_id: str | None
    cancel_reason: str | None


class ClassSessionDetail(ClassSessionResponse):
    """Chi tiết buổi lớp kèm tình trạng chỗ.

    `booked_count` và `seats_left` là dữ liệu vận hành cho nhân viên; endpoint
    công khai chỉ trả `is_full` dạng boolean — số chỗ còn lại đủ để suy ra lớp
    nào vắng, và ở một studio nhỏ đó là thông tin không nên công khai.
    """

    booked_count: int
    seats_left: int
    trainer_name: str


class ChangeTrainerRequest(BaseModel):
    trainer_id: int


class CancelSessionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class CancelSessionResponse(BaseModel):
    session_id: int
    refunded_booking_ids: list[int]
    cancelled_waitlist_ids: list[int]


class RecurrenceRequest(BaseModel):
    start_date: date
    end_date: date
    #: 0 = thứ Hai … 6 = Chủ nhật, theo quy ước của `date.weekday()`.
    weekdays: list[int] = Field(min_length=1)
    start_time: time
    duration_minutes: int = Field(gt=0, le=480)
    trainer_id: int
    class_type: ClassType
    capacity: int | None = Field(default=None, ge=1)


class OccurrenceResponse(BaseModel):
    starts_at: datetime
    ends_at: datetime
    conflict: str | None


class RecurrencePreviewResponse(BaseModel):
    occurrences: list[OccurrenceResponse]
    available_count: int
    conflict_count: int


class RecurrenceCreatedResponse(BaseModel):
    recurrence_id: str
    sessions: list[ClassSessionResponse]


class TrainerMonthlyStats(BaseModel):
    """Thống kê tháng ở màn chi tiết HLV (F04, khép lại trong cửa sổ F06).

    Tính trực tiếp từ `class_session` — cùng nguồn với báo cáo HLV ở F09, nên
    hai màn hình không thể cho hai con số khác nhau.
    """

    trainer_id: int
    year: int
    month: int
    scheduled_sessions: int
    cancelled_sessions: int
    total_bookings: int
