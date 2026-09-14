"""Đăng nhập, làm mới phiên, quên/đặt lại và đổi mật khẩu."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import security
from app.core.email import send_password_reset
from app.core.errors import UnauthorizedError
from app.core.permissions import Actor, get_current_actor
from app.core.rate_limit import client_ip, login_limiter, password_reset_limiter
from app.db import get_db
from app.domain.rules import UserStatus
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenPair,
    UpdateMeRequest,
)
from app.services import user_profile

router = APIRouter(prefix="/auth", tags=["auth"])

_INVALID_LOGIN = "Email hoặc mật khẩu không đúng."
_RATE_LIMITED = "Quá nhiều lần thử. Vui lòng chờ rồi thử lại."


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenPair:
    # Chặn theo cả IP và tài khoản: chỉ theo IP thì đổi IP là qua, chỉ theo
    # tài khoản thì kẻ tấn công rải mật khẩu qua nhiều tài khoản.
    """Đăng nhập bằng email và mật khẩu.

    Bị giới hạn tần suất theo IP và theo email. Sai mật khẩu và email không tồn
    tại trả về cùng một thông báo — phân biệt hai trường hợp là cho người ngoài
    một cách dò xem ai có tài khoản ở studio.
    """
    ip_key = f"ip:{client_ip(request)}"
    account_key = f"account:{payload.email.lower()}"
    login_limiter.assert_allowed(ip_key, _RATE_LIMITED)
    login_limiter.assert_allowed(account_key, _RATE_LIMITED)

    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not security.verify_password(payload.password, user.password_hash):
        login_limiter.register(ip_key)
        login_limiter.register(account_key)
        raise UnauthorizedError(_INVALID_LOGIN)
    if not user.is_active:
        login_limiter.register(ip_key)
        login_limiter.register(account_key)
        raise UnauthorizedError("Tài khoản đã bị khoá.")

    # Chỉ xoá bộ đếm **theo tài khoản**: người gõ nhầm rồi đăng nhập đúng thì
    # không bị phạt tiếp. Bộ đếm theo IP giữ nguyên — nó là chiều duy nhất
    # chống rải mật khẩu qua nhiều tài khoản, và xoá nó bằng một lần đăng nhập
    # thật là đúng đường kẻ tấn công dùng để vòng qua: cứ vài lần thử sai thì
    # đăng nhập một lần bằng tài khoản của chính mình.
    login_limiter.reset(account_key)
    return TokenPair(
        access_token=security.create_access_token(user),
        refresh_token=security.issue_refresh_token(db, user),
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    """Đổi refresh token lấy một cặp token mới.

    Xoay token có **cửa sổ ân hạn 10 giây**: trình bày lại token đã dùng sau
    ngần đó bị coi là token bị đánh cắp và thu hồi toàn bộ phiên của người đó.
    FE vì thế chỉ được có một lần refresh đang bay.
    """
    user, new_refresh = security.rotate_refresh_token(db, payload.refresh_token)
    return TokenPair(access_token=security.create_access_token(user), refresh_token=new_refresh)


@router.post("/logout", response_model=MessageResponse)
def logout(
    actor: Actor = Depends(get_current_actor), db: Session = Depends(get_db)
) -> MessageResponse:
    """Thu hồi refresh token của phiên hiện tại."""
    security.revoke_all_refresh_tokens(db, actor.id)
    return MessageResponse(message="Đã đăng xuất khỏi mọi thiết bị.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Gửi liên kết đặt lại qua email.

    Ba tính chất phải giữ cùng lúc:

    - **Thông điệp giống nhau** dù email có tồn tại hay không — phản hồi khác
      nhau chính là công cụ dò danh sách email của studio.
    - **Thời gian phản hồi cũng phải giống nhau.** Gửi thư đồng bộ thì chỉ
      email tồn tại mới tốn một vòng SMTP, nên thân response giống nhau mà đồng
      hồ thì không. Vì vậy việc gửi được đẩy ra `BackgroundTasks`, chạy sau khi
      response đã trả.
    - **Có giới hạn tần suất**, theo cả IP và email: đây là endpoint ẩn danh mà
      sinh được email và ghi được CSDL.
    """
    email = payload.email.lower()
    ip_key = f"reset-ip:{client_ip(request)}"
    email_key = f"reset-email:{email}"
    password_reset_limiter.assert_allowed(ip_key, _RATE_LIMITED)
    password_reset_limiter.assert_allowed(email_key, _RATE_LIMITED)
    password_reset_limiter.register(ip_key)
    password_reset_limiter.register(email_key)

    user = db.scalar(select(User).where(User.email == email))
    if user is not None and user.is_active:
        raw_token = security.create_password_reset(db, user)
        # Commit trước khi xếp hàng gửi: nếu transaction hỏng sau đó, người
        # dùng sẽ cầm một liên kết trỏ tới token không tồn tại.
        db.commit()
        background.add_task(send_password_reset, user.email, raw_token)
    return MessageResponse(
        message="Nếu email tồn tại trong hệ thống, liên kết đặt lại đã được gửi."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    """Đặt mật khẩu mới bằng token nhận qua email. Token dùng một lần."""
    user = security.consume_password_reset(db, payload.token)
    user.password_hash = security.hash_password(payload.new_password)
    user.status = UserStatus.ACTIVE
    # Đổi mật khẩu phải đá mọi phiên cũ ra, kể cả phiên của kẻ đang chiếm tài khoản.
    security.revoke_all_refresh_tokens(db, user.id)
    return MessageResponse(message="Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Đổi mật khẩu khi đang đăng nhập; phải khai đúng mật khẩu cũ."""
    if not security.verify_password(payload.current_password, actor.user.password_hash):
        raise UnauthorizedError("Mật khẩu hiện tại không đúng.")
    actor.user.password_hash = security.hash_password(payload.new_password)
    security.revoke_all_refresh_tokens(db, actor.id)
    return MessageResponse(message="Đã đổi mật khẩu. Vui lòng đăng nhập lại.")


@router.get("/me", response_model=MeResponse)
def me(actor: Actor = Depends(get_current_actor)) -> MeResponse:
    """Vai và hồ sơ nghiệp vụ của người đang đăng nhập.

    Đây là **nguồn duy nhất** cho `student_id` / `trainer_id` — đừng đọc chúng
    từ payload JWT.
    """
    return MeResponse(
        id=actor.user.id,
        email=actor.user.email,
        full_name=actor.user.full_name,
        phone=actor.user.phone,
        role=actor.role,
        status=actor.user.status,
        student_id=actor.student_id,
        trainer_id=actor.trainer_id,
    )


@router.patch("/me", response_model=MeResponse)
def update_me(
    payload: UpdateMeRequest,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> MeResponse:
    """Tự sửa tên và số điện thoại của tài khoản đang đăng nhập.

    Đồng bộ hồ sơ học viên/HLV liên kết trong cùng giao dịch.
    Email đăng nhập, vai và liên kết hồ sơ không được sửa qua endpoint này.
    """
    user_profile.update_profile(db, actor, payload)
    return me(actor)
