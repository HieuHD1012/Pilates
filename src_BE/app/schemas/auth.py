"""Schema cho luồng xác thực."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.rules import Role, UserStatus


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(max_length=1024)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    #: Token thô đến từ liên kết trong email. Không bao giờ do API phát ra.
    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=10, max_length=128)


class ChangePasswordRequest(BaseModel):
    #: Bắt buộc với mọi vai, kể cả ADMIN đổi mật khẩu của chính mình.
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None
    phone: str | None = None
    role: Role
    status: UserStatus
    #: Có giá trị khi tài khoản được nối với hồ sơ học viên / HLV tương ứng.
    student_id: int | None = None
    trainer_id: int | None = None


class UpdateMeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, min_length=1, max_length=32)


class MessageResponse(BaseModel):
    message: str
