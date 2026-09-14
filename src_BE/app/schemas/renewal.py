"""Schema cho nhắc gia hạn."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class RenewalSummaryResponse(BaseModel):
    """Bốn con số của bảng tổng hợp — **đếm người, không đếm tiền**.

    Màn hình này mở hằng ngày ở quầy lễ tân, nơi khách đứng nhìn được màn hình;
    số liệu kinh doanh không có chỗ ở đây.
    """

    needing_contact: int
    low_credits: int
    expiring_soon: int
    never_contacted: int


class RenewalCandidateResponse(BaseModel):
    student_id: int
    student_name: str
    student_phone: str
    student_package_id: int
    package_name: str
    credits_remaining: int
    end_date: date
    days_remaining: int
    #: `LOW_CREDITS` và/hoặc `EXPIRING_SOON`. Giao diện nói lý do bằng chữ; một
    #: con số đổi màu không cho biết người này sắp hết buổi hay sắp hết hạn.
    reasons: list[str]
    last_contacted_at: datetime | None
    last_contact_result: str | None
    next_contact_date: date | None


class RenewalContactCreate(BaseModel):
    student_id: int
    result: str = Field(min_length=1, max_length=1000)
    next_contact_date: date | None = None


class RenewalContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    contacted_at: datetime
    result: str
    next_contact_date: date | None
    actor_user_id: int
