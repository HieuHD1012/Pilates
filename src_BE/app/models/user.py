"""Tài khoản, refresh token và token đặt lại mật khẩu."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.rules import Role, UserStatus
from app.models.base import Base, CreatedAtMixin, TimestampTz, enum_column


class User(Base, CreatedAtMixin):
    __tablename__ = "user_account"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))
    #: NULL cho tài khoản nhập từ Excel — kích hoạt qua email, không bao giờ
    #: sinh mật khẩu suy ra được từ số điện thoại (F10).
    password_hash: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(enum_column(Role, "role_enum"), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        enum_column(UserStatus, "user_status_enum"),
        nullable=False,
        default=UserStatus.ACTIVE,
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    full_name: Mapped[str | None] = mapped_column(String(120))


class RefreshToken(Base):
    """Refresh token lưu trong CSDL để thu hồi được.

    JWT vô trạng thái: nếu không lưu ở đây thì khoá tài khoản chỉ chặn lần đăng
    nhập sau, người bị khoá vẫn cầm refresh token và tiếp tục phát access token.
    """

    __tablename__ = "refresh_token"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False, index=True
    )
    jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        TimestampTz, nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(TimestampTz)
    #: `jti` của token thay thế. Có giá trị nghĩa là token này đã được xoay
    #: vòng; dùng lại nó là dấu hiệu token bị đánh cắp.
    replaced_by: Mapped[str | None] = mapped_column(String(64))


class PasswordReset(Base, CreatedAtMixin):
    """Token đặt lại mật khẩu: lưu dạng hash, có hạn, dùng một lần."""

    __tablename__ = "password_reset"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_password_reset_token_hash"),
        Index("ix_password_reset_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TimestampTz, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(TimestampTz)
