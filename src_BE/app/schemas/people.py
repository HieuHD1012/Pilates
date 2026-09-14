"""Schema nội bộ cho học viên, HLV, khách quan tâm và thông báo.

Phân biệt với `app/schemas/public.py`: những model ở đây trả cho người đã đăng
nhập và có quyền, nên chứa PII. Không bao giờ dùng chúng cho endpoint công khai.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.rules import PHONE_PATTERN, ClassType, LeadStatus, StudentStatus

# --- Học viên ----------------------------------------------------------------


class StudentCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=PHONE_PATTERN)
    email: EmailStr | None = None
    dob: date | None = None
    note: str | None = Field(default=None, max_length=2000)


class StudentUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, pattern=PHONE_PATTERN)
    email: EmailStr | None = None
    dob: date | None = None
    note: str | None = Field(default=None, max_length=2000)
    status: StudentStatus | None = None


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    full_name: str
    phone: str
    email: str | None
    dob: date | None
    note: str | None
    status: StudentStatus
    created_at: datetime


class PackageSummary(BaseModel):
    """Một gói đang hoạt động của học viên, kèm số buổi còn lại."""

    id: int
    name: str
    class_type: ClassType
    price: Decimal
    start_date: date
    end_date: date
    credits_remaining: int
    days_remaining: int


class StudentOverview(BaseModel):
    """Tổng quan hồ sơ học viên.

    `credits_remaining` **chỉ tính gói đang hoạt động**. Gói hết hạn còn buổi
    chưa dùng không bị thu hồi nhưng cũng không vào số dư hiển thị — nếu tính
    cả, màn hình sẽ báo "còn 4 buổi" trên một gói đã chết.
    """

    student: StudentResponse
    credits_remaining: int
    active_packages: list[PackageSummary]
    #: Còn ≤6 buổi **hoặc** ≤15 ngày. Quan hệ là HOẶC: người còn 20 buổi nhưng
    #: hết hạn sau 10 ngày vẫn cần liên hệ.
    needs_renewal: bool


# --- Ảnh tiến trình ----------------------------------------------------------


class ProgressPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    taken_at: datetime
    uploaded_by: int
    created_at: datetime
    #: Cố ý **không** trả `storage_key`: ảnh chỉ lấy được qua endpoint kiểm
    #: quyền theo `id`, nên một khoá lọt ra ngoài cũng không mở được gì.


# --- Huấn luyện viên ---------------------------------------------------------


class TrainerCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    bio: str | None = Field(default=None, max_length=4000)
    specialties: str | None = Field(default=None, max_length=1000)
    is_public: bool = False
    user_id: int | None = None


class TrainerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    bio: str | None = Field(default=None, max_length=4000)
    specialties: str | None = Field(default=None, max_length=1000)
    is_public: bool | None = None
    is_active: bool | None = None
    user_id: int | None = None


class TrainerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str | None
    bio: str | None
    specialties: str | None
    photo_key: str | None
    is_public: bool
    is_active: bool
    user_id: int | None
    created_at: datetime


# --- Khách quan tâm ----------------------------------------------------------


class LeadCreate(BaseModel):
    """Form tư vấn công khai — đầu vào từ người ẩn danh.

    Mọi trường ở đây được sanitize phía server trước khi ghi: đây là đường XSS
    lưu trữ ngắn nhất của hệ (khách ẩn danh gửi → nhân viên mở danh sách).
    """

    full_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=PHONE_PATTERN)
    need: str | None = Field(default=None, max_length=1000)
    source: str | None = Field(default=None, max_length=64)


class LeadUpdate(BaseModel):
    #: `CONVERTED` cố ý không có ở đây: nó chỉ được đặt bởi `/leads/{id}/convert`,
    #: cùng lúc với `converted_student_id`. Cho đặt tay thì hai trường lệch nhau
    #: và bản ghi nói rằng đã có học viên trong khi không có ai.
    status: Literal[LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.LOST] | None = None
    need: str | None = Field(default=None, max_length=1000)
    assigned_to: int | None = None


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    need: str | None
    source: str | None
    status: LeadStatus
    assigned_to: int | None
    converted_student_id: int | None
    created_at: datetime


# --- Thông báo / khuyến mãi --------------------------------------------------


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10_000)
    is_published: bool = False
    publish_at: datetime | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    body: str | None = Field(default=None, min_length=1, max_length=10_000)
    is_published: bool | None = None
    publish_at: datetime | None = None


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    is_published: bool
    publish_at: datetime | None
    created_by: int
    created_at: datetime
    updated_at: datetime | None
    updated_by: int | None
