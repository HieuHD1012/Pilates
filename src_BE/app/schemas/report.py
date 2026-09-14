"""Schema báo cáo."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.domain.rules import PaymentMethod, SessionStatus


class RevenueByMethodResponse(BaseModel):
    method: PaymentMethod
    total: Decimal
    payment_count: int


class RevenueSummaryResponse(BaseModel):
    """Chỉ gồm giao dịch **đã xác nhận**.

    `detail_path` đi kèm con số vì một con số không mở ra được các dòng tạo nên
    nó thì không đối chiếu được — và một con số không đối chiếu được không có
    chỗ trên màn hình.
    """

    period_start: date
    period_end: date
    total: Decimal
    payment_count: int
    by_method: list[RevenueByMethodResponse]
    detail_path: str


class RevenueRowResponse(BaseModel):
    payment_id: int
    confirmed_at: datetime
    student_name: str
    package_name: str
    amount: Decimal
    method: PaymentMethod


class ClassStatsResponse(BaseModel):
    period_start: date
    period_end: date
    scheduled_sessions: int
    cancelled_sessions: int
    total_bookings: int
    total_capacity: int
    #: `None` khi chưa có lớp nào trong kỳ. Không phải 0 — không có lớp thì mức
    #: lấp đầy không tồn tại, và 0% nói rằng lớp mở mà không ai đến.
    fill_rate: float | None
    detail_path: str


class TrainerStatsResponse(BaseModel):
    trainer_id: int
    trainer_name: str
    scheduled_sessions: int
    cancelled_sessions: int
    total_bookings: int


class TrainerClassSizeResponse(BaseModel):
    """Một dòng của bảng phân bố lớp theo sĩ số.

    Cột phẳng thay vì map sĩ số → số lớp: bảng có đúng năm mức cố định, và
    cột phẳng đọc thẳng được từ tài liệu API mà không phải đoán khoá.
    """

    trainer_id: int
    trainer_name: str
    size_1: int
    size_2: int
    size_3: int
    size_4: int
    size_5: int
    #: Lớp đông hơn 5 người. Thường bằng 0; khác 0 nghĩa là có lớp nằm ngoài
    #: năm cột.
    sessions_over_max: int
    #: Lớp đã xếp lịch nhưng không ai đăng ký — trên thực tế lớp không diễn ra.
    #: Không phải lớp bị huỷ tường minh; số lớp huỷ nằm ở `/reports/trainers`.
    sessions_empty: int
    #: Tổng mọi cột trên dòng, bằng đúng `scheduled_sessions` của báo cáo HLV
    #: trong cùng kỳ.
    total_sessions: int


class UnconfirmedPaymentResponse(BaseModel):
    payment_id: int
    student_id: int
    student_name: str
    student_package_id: int
    package_name: str
    amount: Decimal
    recorded_at: datetime
    days_pending: int


class SessionRowResponse(BaseModel):
    class_session_id: int
    starts_at: datetime
    trainer_name: str
    capacity: int
    booked_count: int
    status: SessionStatus


class DashboardNumber(BaseModel):
    """Một con số trên bảng tổng hợp.

    `value` nhận `None` khi **chưa có dữ liệu**, khác hẳn với 0 nghĩa là "đã đếm
    và bằng không". Giao diện để trống ô `None`; điền 0 vào đó là bịa ra một
    phép đo chưa từng chạy.
    """

    key: str
    label: str
    value: int | None
    detail_path: str


class DashboardResponse(BaseModel):
    numbers: list[DashboardNumber]
    sessions_needing_attention: list[SessionRowResponse]
    sessions_today: list[SessionRowResponse]
