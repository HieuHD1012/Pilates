"""Học viên, huấn luyện viên, khách quan tâm và ảnh tiến trình."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.rules import LeadStatus, StudentStatus
from app.models.base import Base, CreatedAtMixin, TimestampTz, enum_column


class Student(Base, CreatedAtMixin):
    __tablename__ = "student"
    __table_args__ = (
        # Khoá ngoài ổn định từ file Excel — để chạy lại import không nhân đôi (F10).
        UniqueConstraint(
            "import_source", "external_ref", name="uq_student_import_ref"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), unique=True
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(254))
    dob: Mapped[date | None] = mapped_column()
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[StudentStatus] = mapped_column(
        enum_column(StudentStatus, "student_status_enum"),
        nullable=False,
        default=StudentStatus.ACTIVE,
    )
    import_source: Mapped[str | None] = mapped_column(String(64))
    external_ref: Mapped[str | None] = mapped_column(String(64))


class Trainer(Base, CreatedAtMixin):
    __tablename__ = "trainer"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), unique=True
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    #: Văn bản tự do do nhân viên nhập → phải đi qua validator P3 khi ghi.
    bio: Mapped[str | None] = mapped_column(Text)
    specialties: Mapped[str | None] = mapped_column(Text)
    photo_key: Mapped[str | None] = mapped_column(String(255))
    #: Quyết định HLV có hiện trên trang công khai hay không.
    is_public: Mapped[bool] = mapped_column(nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)


class Lead(Base, CreatedAtMixin):
    """Khách quan tâm từ form tư vấn công khai."""

    __tablename__ = "lead"
    __table_args__ = (Index("ix_lead_phone_created", "phone", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    need: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[LeadStatus] = mapped_column(
        enum_column(LeadStatus, "lead_status_enum"),
        nullable=False,
        default=LeadStatus.NEW,
    )
    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
    converted_student_id: Mapped[int | None] = mapped_column(
        ForeignKey("student.id", ondelete="SET NULL")
    )


class ProgressPhoto(Base, CreatedAtMixin):
    """Ảnh tiến trình — dữ liệu nhạy cảm về cơ thể người thật.

    Chỉ ADMIN, HLV phụ trách học viên đó và chính học viên đó xem được.
    Lưu ở thư mục riêng tư, phục vụ qua endpoint kiểm quyền, không public bucket.
    """

    __tablename__ = "progress_photo"
    __table_args__ = (Index("ix_progress_photo_student_taken", "student_id", "taken_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), nullable=False
    )
    storage_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    taken_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    uploaded_by: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )


class Announcement(Base, CreatedAtMixin):
    """Thông báo/khuyến mãi công khai — đường P3 lọt lên trang công khai sau go-live."""

    __tablename__ = "announcement"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(nullable=False, default=False)
    publish_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    #: Nội dung công khai sửa được sau go-live, nên phải truy được ai sửa lần
    #: cuối — đây là trường đi thẳng lên trang khách đọc.
    updated_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    updated_by: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )


class RenewalContact(Base):
    """Lịch sử chăm sóc gia hạn — append, không ghi đè (F08)."""

    __tablename__ = "renewal_contact"
    __table_args__ = (Index("ix_renewal_contact_student", "student_id", "contacted_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student.id", ondelete="CASCADE"), nullable=False
    )
    contacted_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    next_contact_date: Mapped[date | None] = mapped_column()
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
