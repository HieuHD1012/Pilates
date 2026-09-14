"""Buổi lớp, đăng ký và danh sách chờ."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Computed,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import TSTZRANGE, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.rules import BookingStatus, ClassType, SessionStatus, WaitlistStatus
from app.models.base import Base, CreatedAtMixin, TimestampTz, enum_column


class ClassSession(Base, CreatedAtMixin):
    """Một buổi lớp cụ thể.

    Lịch lặp lại sinh ra nhiều bản ghi ở đây chứ không lưu quy tắc rồi tính lúc
    đọc — từng buổi phải sửa/hủy độc lập và gắn được đăng ký.
    """

    __tablename__ = "class_session"
    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_class_session_time_order"),
        CheckConstraint("capacity > 0", name="ck_class_session_capacity_positive"),
        # Một HLV không dạy hai lớp chồng giờ. Mệnh đề WHERE là bắt buộc: thiếu
        # nó, một lớp đã CANCELLED vẫn chiếm khung giờ của chính nó vĩnh viễn.
        ExcludeConstraint(
            ("trainer_id", "="),
            ("slot", "&&"),
            name="ex_class_session_trainer_no_overlap",
            using="gist",
            where=text("status = 'SCHEDULED'"),
        ),
        UniqueConstraint("import_source", "external_ref", name="uq_class_session_import_ref"),
        Index("ix_class_session_starts_at", "starts_at"),
        Index("ix_class_session_trainer_starts", "trainer_id", "starts_at"),
        Index("ix_class_session_recurrence", "recurrence_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    starts_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    ends_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    #: Cột sinh tự động cho exclusion constraint. Cần extension `btree_gist`.
    slot: Mapped[object] = mapped_column(
        TSTZRANGE, Computed("tstzrange(starts_at, ends_at)", persisted=True)
    )
    trainer_id: Mapped[int] = mapped_column(
        ForeignKey("trainer.id", ondelete="RESTRICT"), nullable=False
    )
    class_type: Mapped[ClassType] = mapped_column(
        enum_column(ClassType, "class_type_enum"), nullable=False
    )
    #: Sức chứa do nhân viên đặt. Private = 1, Duo = Private sức chứa 2.
    #: Không hardcode con số nào — đặc biệt không dùng 3 (P3 cấm).
    capacity: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        enum_column(SessionStatus, "session_status_enum"),
        nullable=False,
        default=SessionStatus.SCHEDULED,
    )
    recurrence_id: Mapped[str | None] = mapped_column(String(36))
    cancel_reason: Mapped[str | None] = mapped_column(Text)
    cancelled_by: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    import_source: Mapped[str | None] = mapped_column(String(64))
    external_ref: Mapped[str | None] = mapped_column(String(64))


class Booking(Base, CreatedAtMixin):
    __tablename__ = "booking"
    __table_args__ = (
        # Chặn dùng gói của học viên khác ở tầng CSDL, không chỉ ở tầng app.
        ForeignKeyConstraint(
            ["student_id", "student_package_id"],
            ["student_package.student_id", "student_package.id"],
            name="fk_booking_package_belongs_to_student",
            ondelete="RESTRICT",
        ),
        # Chặn đặt trùng cùng một lớp.
        Index(
            "uq_booking_active_per_student_session",
            "class_session_id",
            "student_id",
            unique=True,
            postgresql_where=text("status IN ('BOOKED', 'ATTENDED', 'NO_SHOW')"),
        ),
        Index("ix_booking_session_status", "class_session_id", "status"),
        Index("ix_booking_student", "student_id"),
        Index("ix_booking_package", "student_package_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    class_session_id: Mapped[int] = mapped_column(
        ForeignKey("class_session.id", ondelete="RESTRICT"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(nullable=False)
    student_package_id: Mapped[int] = mapped_column(nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        enum_column(BookingStatus, "booking_status_enum"),
        nullable=False,
        default=BookingStatus.BOOKED,
    )
    booked_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    cancelled_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    attendance_marked_by: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    attendance_marked_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    # Cột lịch sử; không cấp ân hạn, không có hiệu lực và không trả qua API.
    has_reschedule_grace: Mapped[bool] = mapped_column(nullable=False, default=False)


class WaitlistEntry(Base, CreatedAtMixin):
    """Danh sách chờ. Thứ tự theo `created_at`, hoà thì `id`.

    Cố ý không có cột `position`: số nguyên tự tăng thủ công sẽ đụng nhau khi
    hai người vào chờ cùng lúc, làm quy tắc "thứ tự đăng ký" trở nên bất định.
    """

    __tablename__ = "waitlist_entry"
    __table_args__ = (
        Index(
            "uq_waitlist_waiting_per_student_session",
            "class_session_id",
            "student_id",
            unique=True,
            postgresql_where=text("status = 'WAITING'"),
        ),
        Index("ix_waitlist_session_created", "class_session_id", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    class_session_id: Mapped[int] = mapped_column(
        ForeignKey("class_session.id", ondelete="RESTRICT"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[WaitlistStatus] = mapped_column(
        enum_column(WaitlistStatus, "waitlist_status_enum"),
        nullable=False,
        default=WaitlistStatus.WAITING,
    )
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT"), nullable=False
    )
    promoted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    promoted_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    cancelled_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="RESTRICT")
    )
    #: Đi kèm `cancelled_by_user_id`: bất biến của dự án là "mọi thay đổi trạng
    #: thái lưu **người thực hiện và thời điểm**", và waitlist nằm trong danh
    #: sách đó.
    cancelled_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    #: Vì sao lần chuyển vào lớp thất bại — ghi ở transaction riêng sau khi
    #: transaction booking rollback, để entry ở lại hàng chờ và nhân viên
    #: thấy được lý do thay vì bấm lại mãi không hiểu.
    failure_reason: Mapped[str | None] = mapped_column(Text)


class ImportRun(Base, CreatedAtMixin):
    """Một lần chạy nhập dữ liệu ban đầu (F10)."""

    __tablename__ = "import_run"

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    dry_run: Mapped[bool] = mapped_column(nullable=False, default=True)
    summary: Mapped[str | None] = mapped_column(Text)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL")
    )
