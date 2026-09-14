"""Schema cho gói tập, sổ buổi và thanh toán."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.rules import (
    ClassType,
    LedgerReason,
    PackageStatus,
    PaymentMethod,
    PaymentStatus,
)

# --- Loại gói ----------------------------------------------------------------


class PackageTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    #: `None` nghĩa là studio **chưa cung cấp giá** — khác hẳn 0, vốn là một con
    #: số và nó nói sai. Trang công khai dựa vào phân biệt này.
    price: Decimal | None = Field(default=None, ge=0)
    credits: int = Field(gt=0)
    duration_days: int = Field(gt=0)
    class_type: ClassType
    is_selling: bool = True


class PackageTypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price: Decimal | None = Field(default=None, ge=0)
    credits: int | None = Field(default=None, gt=0)
    duration_days: int | None = Field(default=None, gt=0)
    is_selling: bool | None = None


class PackageTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: Decimal | None
    credits: int
    duration_days: int
    class_type: ClassType
    is_selling: bool


# --- Gói của học viên --------------------------------------------------------


class SellPackageRequest(BaseModel):
    student_id: int
    package_type_id: int
    #: Bỏ trống thì tính từ hôm nay theo giờ studio.
    start_date: date | None = None


class RenewPackageRequest(BaseModel):
    extra_days: int = Field(default=0, ge=0)
    extra_credits: int = Field(default=0, ge=0)
    note: str | None = Field(default=None, max_length=500)


class StudentPackageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    package_type_id: int | None
    name_snapshot: str
    price_snapshot: Decimal
    credits_snapshot: int
    class_type_snapshot: ClassType
    start_date: date
    end_date: date
    status: PackageStatus
    balance_cached: int
    created_at: datetime


# --- Sổ buổi -----------------------------------------------------------------


class LedgerEntryResponse(BaseModel):
    """Một dòng sổ, kèm **số dư sau dòng đó**.

    Hai con số cạnh nhau là toàn bộ lý do màn hình này tồn tại: đọc xuôi xuống,
    cộng dồn `delta` thì phải ra đúng `balance_after` ở dòng cuối.
    """

    id: int
    delta: int
    balance_after: int
    reason_code: LedgerReason
    note: str | None
    booking_id: int | None
    actor_user_id: int
    created_at: datetime


class PackageLedgerResponse(BaseModel):
    student_package_id: int
    entries: list[LedgerEntryResponse]
    #: Dòng đóng sổ. Lặp lại số dư cuối **có chủ ý** — người đọc phải đối chiếu
    #: được tổng mình vừa cộng với con số hệ thống khẳng định.
    closing_balance: int


class AdjustCreditsRequest(BaseModel):
    delta: int = Field(description="Số buổi cộng (dương) hoặc trừ (âm).")
    #: Bắt buộc, và CHECK constraint ở CSDL cũng đòi. Điều chỉnh tay bỏ qua mọi
    #: quy tắc khác nên nó phải để lại dấu vết ai quyết định gì, vì sao.
    reason: str = Field(min_length=3, max_length=500)


# --- Thanh toán --------------------------------------------------------------


class RecordPaymentRequest(BaseModel):
    student_package_id: int
    amount: Decimal = Field(ge=0)
    method: PaymentMethod
    note: str | None = Field(default=None, max_length=500)


class VoidPaymentRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_package_id: int
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus
    note: str | None
    recorded_by: int
    recorded_at: datetime
    confirmed_by: int | None
    confirmed_at: datetime | None
    voided_by: int | None
    voided_at: datetime | None
    void_reason: str | None
