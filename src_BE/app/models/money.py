"""Gói tập, sổ buổi và thanh toán — nơi giữ bất biến trung tâm của hệ thống."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.rules import ClassType, LedgerReason, PackageStatus, PaymentMethod, PaymentStatus
from app.models.base import (
    Base,
    CreatedAtMixin,
    TimestampTz,
    enum_column,
    requires_meaningful_text,
)


class PackageType(Base, CreatedAtMixin):
    """Loại gói đang bán. Sửa ở đây không bao giờ chạm gói học viên đã mua."""

    __tablename__ = "package_type"
    __table_args__ = (
        CheckConstraint("credits > 0", name="ck_package_type_credits_positive"),
        CheckConstraint("duration_days > 0", name="ck_package_type_duration_positive"),
        # NULL nghĩa là "studio chưa cung cấp giá" — khác hẳn 0, vốn là một con số
        # và nó nói sai. Trang công khai dựa vào phân biệt này để hiện trạng
        # thái rỗng có nhãn thay vì một mức giá bịa.
        CheckConstraint(
            "price IS NULL OR price >= 0", name="ck_package_type_price_non_negative"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    credits: Mapped[int] = mapped_column(nullable=False)
    duration_days: Mapped[int] = mapped_column(nullable=False)
    class_type: Mapped[ClassType] = mapped_column(
        enum_column(ClassType, "class_type_enum"), nullable=False
    )
    #: Ngừng bán chỉ đổi cờ này, không bao giờ xoá bản ghi.
    is_selling: Mapped[bool] = mapped_column(nullable=False, default=True)


class StudentPackage(Base, CreatedAtMixin):
    """Gói một học viên đang giữ, kèm snapshot giá/buổi tại thời điểm bán."""

    __tablename__ = "student_package"
    __table_args__ = (
        # Đích của composite FK từ booking — chặn dùng gói của học viên khác.
        UniqueConstraint("student_id", "id", name="uq_student_package_student_id"),
        UniqueConstraint(
            "import_source", "external_ref", name="uq_student_package_import_ref"
        ),
        CheckConstraint("balance_cached >= 0", name="ck_student_package_balance_non_negative"),
        CheckConstraint("credits_snapshot > 0", name="ck_student_package_credits_positive"),
        CheckConstraint("end_date >= start_date", name="ck_student_package_date_order"),
        Index("ix_student_package_student_status", "student_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student.id", ondelete="RESTRICT"), nullable=False
    )
    package_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("package_type.id", ondelete="RESTRICT")
    )
    name_snapshot: Mapped[str] = mapped_column(String(120), nullable=False)
    price_snapshot: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    credits_snapshot: Mapped[int] = mapped_column(nullable=False)
    class_type_snapshot: Mapped[ClassType] = mapped_column(
        enum_column(ClassType, "class_type_enum"), nullable=False
    )
    start_date: Mapped[date] = mapped_column(nullable=False)
    end_date: Mapped[date] = mapped_column(nullable=False)
    status: Mapped[PackageStatus] = mapped_column(
        enum_column(PackageStatus, "package_status_enum"),
        nullable=False,
        default=PackageStatus.ACTIVE,
    )
    #: Biểu diễn thứ hai, độc lập với `SUM(delta)`. Nó là thứ biến phép đối soát
    #: từ tautology thành mệnh đề kiểm được. **Chỉ `credit_ledger.py` được ghi**,
    #: và luôn trong cùng transaction với dòng ledger.
    balance_cached: Mapped[int] = mapped_column(nullable=False, default=0)
    import_source: Mapped[str | None] = mapped_column(String(64))
    external_ref: Mapped[str | None] = mapped_column(String(64))


class CreditLedger(Base, CreatedAtMixin):
    """Sổ buổi — APPEND ONLY.

    Trigger ở migration chặn UPDATE/DELETE ở tầng CSDL. Sai thì ghi bút toán
    đối ứng, không sửa lịch sử.
    """

    __tablename__ = "credit_ledger"
    __table_args__ = (
        # `btrim` mặc định chỉ cắt dấu cách, nên `note = '\n'` hay U+00A0 vẫn
        # lọt qua và điều chỉnh tay không lý do vẫn ghi được. Đòi hỏi đúng thứ
        # cần đòi: phải có ít nhất một ký tự **không phải khoảng trắng**.
        CheckConstraint(
            "reason_code <> 'ADMIN_ADJUST' OR "
            f"({requires_meaningful_text('note')})",
            name="ck_credit_ledger_admin_adjust_needs_note",
        ),
        # Hai partial unique index bên dưới khoá theo `booking_id`; NULL không
        # bao giờ đụng unique, nên một dòng CANCEL_REFUND thiếu `booking_id`
        # lặng lẽ vô hiệu hoá lớp chặn hoàn buổi hai lần — và mọi test vẫn xanh.
        CheckConstraint(
            "reason_code NOT IN ('BOOKING_DEDUCT', 'CANCEL_REFUND') OR booking_id IS NOT NULL",
            name="ck_credit_ledger_booking_reason_needs_booking",
        ),
        CheckConstraint("delta <> 0", name="ck_credit_ledger_delta_non_zero"),
        # Chặn hoàn buổi hai lần do double-click.
        Index(
            "uq_credit_ledger_cancel_refund_per_booking",
            "booking_id",
            unique=True,
            postgresql_where=text("reason_code = 'CANCEL_REFUND'"),
        ),
        # Bất biến #3 nửa "đúng một": một booking không thể bị trừ hai lần.
        Index(
            "uq_credit_ledger_booking_deduct_per_booking",
            "booking_id",
            unique=True,
            postgresql_where=text("reason_code = 'BOOKING_DEDUCT'"),
        ),
        Index("ix_credit_ledger_package", "student_package_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_package_id: Mapped[int] = mapped_column(
        ForeignKey("student_package.id", ondelete="RESTRICT"), nullable=False
    )
    delta: Mapped[int] = mapped_column(nullable=False)
    reason_code: Mapped[LedgerReason] = mapped_column(
        enum_column(LedgerReason, "ledger_reason_enum"), nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text)
    booking_id: Mapped[int | None] = mapped_column(
        ForeignKey("booking.id", ondelete="RESTRICT")
    )
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )


class Payment(Base):
    """Thanh toán tiền mặt / chuyển khoản do nhân viên ghi nhận.

    Lưu đủ người và thời điểm cho cả ba chuyển trạng thái: ghi nhận, xác nhận,
    huỷ — không chỉ riêng lúc ghi nhận.
    """

    __tablename__ = "payment"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="ck_payment_amount_non_negative"),
        CheckConstraint(
            "status <> 'CONFIRMED' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)",
            name="ck_payment_confirmed_has_actor",
        ),
        CheckConstraint(
            "status <> 'VOID' OR (voided_by IS NOT NULL AND voided_at IS NOT NULL "
            f"AND {requires_meaningful_text('void_reason')})",
            name="ck_payment_void_has_actor_and_reason",
        ),
        Index("ix_payment_package", "student_package_id"),
        Index("ix_payment_status_confirmed_at", "status", "confirmed_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_package_id: Mapped[int] = mapped_column(
        ForeignKey("student_package.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        enum_column(PaymentMethod, "payment_method_enum"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        enum_column(PaymentStatus, "payment_status_enum"),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    note: Mapped[str | None] = mapped_column(Text)

    recorded_by: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    recorded_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    confirmed_by: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    voided_by: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    voided_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    void_reason: Mapped[str | None] = mapped_column(Text)
