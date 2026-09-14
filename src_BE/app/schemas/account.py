"""Schema quản lý tài khoản (chỉ ADMIN)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.rules import Role, UserStatus


class AccountCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    full_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    role: Role
    #: Bắt buộc khi role=STUDENT: admin cấp tài khoản cho hồ sơ đã có.
    student_id: int | None = Field(default=None, ge=1)
    #: Bỏ trống thì tài khoản ở trạng thái PENDING_ACTIVATION và người dùng đặt
    #: mật khẩu qua liên kết gửi email — đường duy nhất dùng cho tài khoản nhập
    #: từ Excel, vì mật khẩu suy ra từ số điện thoại là mật khẩu công khai.
    password: str | None = Field(default=None, min_length=10, max_length=128)


class AccountUpdate(BaseModel):
    """Sửa hồ sơ tài khoản. **Từ chối trường lạ thay vì bỏ qua.**

    Mặc định của Pydantic là im lặng loại bỏ khoá không khai báo, và ở đúng
    schema này điều đó nguy hiểm: một màn hình quản trị gửi
    `{"is_active": false}` sẽ nhận 200, hiển thị "đã lưu", và tài khoản vẫn mở.
    Khoá tài khoản là việc của `POST /accounts/{id}/lock` — nơi refresh token
    cũng bị thu hồi — nên đường này phải báo lỗi chứ không được nhận nhầm.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    role: Role | None = None
    #: Nối tài khoản học viên đã tồn tại; không dùng để chuyển chủ sở hữu.
    student_id: int | None = Field(default=None, ge=1)


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    phone: str | None
    role: Role
    status: UserStatus
    is_active: bool
    created_at: datetime
    #: Hồ sơ nghiệp vụ đang nối với tài khoản này, cùng hình dạng như
    #: `MeResponse` của `GET /auth/me`. Có nó thì chiều đọc và chiều ghi của
    #: liên kết đối xứng: `PATCH /accounts/{id}` **nhận** `student_id`, nên màn
    #: hình cũng phải **đọc lại** được nó ở cùng chỗ thay vì đi vòng qua
    #: `student.user_id`.
    student_id: int | None = None
    trainer_id: int | None = None
