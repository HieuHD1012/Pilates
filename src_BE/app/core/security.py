"""Băm mật khẩu, JWT, refresh token xoay vòng và token đặt lại mật khẩu."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import UnauthorizedError
from app.domain.rules import now
from app.models.user import PasswordReset, RefreshToken, User

_hasher = PasswordHasher()


# --- Mật khẩu ---------------------------------------------------------------


def hash_password(plain: str) -> str:
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str | None) -> bool:
    """So khớp mật khẩu.

    `hashed` là NULL với tài khoản nhập từ Excel chưa kích hoạt. Vẫn chạy một
    lần băm giả để thời gian phản hồi không tiết lộ tài khoản nào tồn tại.
    """
    if not hashed:
        _hasher.hash(plain)
        return False
    try:
        return _hasher.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError):
        return False


# --- Access token -----------------------------------------------------------


def create_access_token(user: User) -> str:
    settings = get_settings()
    issued = now()
    payload = {
        "sub": str(user.id),
        "role": user.role.value,
        "typ": "access",
        "iat": issued,
        "exp": issued + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Giải mã access token và **bắt buộc kiểm loại token**.

    Thiếu phép kiểm `typ`, mọi JWT ký đúng khoá đều qua được — kể cả refresh
    token, vốn cũng mang `sub`. Khi đó refresh token dùng thẳng làm
    `Authorization: Bearer` và toàn bộ cơ chế thu hồi phiên chỉ còn chặn
    `/auth/refresh`: đăng xuất hay đổi mật khẩu xong, token bị đánh cắp vẫn
    đọc được dữ liệu suốt thời hạn của refresh token.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.") from exc

    if payload.get("typ") != "access":
        raise UnauthorizedError("Token không dùng được để truy cập API.")
    return payload


# --- Refresh token ----------------------------------------------------------
#
# JWT vô trạng thái, nên `is_active = false` một mình chỉ chặn lần đăng nhập
# sau. Refresh token phải nằm trong CSDL để thu hồi được ngay: nhân viên nghỉ
# việc chiều thứ Sáu, nếu không có bảng này, vẫn đọc được PII học viên suốt
# cuối tuần bằng refresh token đang cầm.


def _refresh_jwt(jti: str, user_id: int, expires_at: datetime) -> str:
    settings = get_settings()
    payload = {"sub": str(user_id), "jti": jti, "typ": "refresh", "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def issue_refresh_token(db: Session, user: User) -> str:
    settings = get_settings()
    jti = uuid.uuid4().hex
    expires_at = now() + timedelta(days=settings.refresh_token_days)
    db.add(RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at))
    db.flush()
    return _refresh_jwt(jti, user.id, expires_at)


def _replay_within_grace(db: Session, stored: RefreshToken) -> tuple[User, str] | None:
    """Trả lại đúng cặp token đã phát, nếu đây là một lần gửi trùng chứ không
    phải token bị đánh cắp.

    Xoay vòng nghiêm ngặt coi mọi lần dùng lại là dấu hiệu trộm token. Điều đó
    đúng với một lần replay thật, nhưng sai với thứ xảy ra hằng ngày: SPA bắn
    vài request cùng lúc khi access token hết hạn, request thứ hai cầm token
    vừa bị xoay vòng cách đó vài mili giây — và người dùng, không làm gì sai,
    bị đá khỏi mọi thiết bị.

    Cửa sổ ân hạn thu hẹp khoảng đó lại: trong vài giây sau khi xoay vòng, nếu
    bản thay thế **vẫn còn sống**, ta trả lại chính nó. Ngoài cửa sổ, hoặc khi
    bản thay thế đã bị dùng tiếp, vẫn là trộm token và vẫn thu hồi sạch.
    """
    settings = get_settings()
    if stored.revoked_at is None:
        return None
    if (now() - stored.revoked_at).total_seconds() > settings.refresh_reuse_grace_seconds:
        return None

    replacement = db.scalar(
        select(RefreshToken).where(RefreshToken.jti == stored.replaced_by)
    )
    if (
        replacement is None
        or replacement.revoked_at is not None
        or replacement.replaced_by is not None
        or replacement.expires_at <= now()
    ):
        return None

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        return None
    return user, _refresh_jwt(replacement.jti, user.id, replacement.expires_at)


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[User, str]:
    """Đổi một refresh token lấy cặp token mới.

    Token cũ bị đánh dấu đã thay thế. Dùng lại nó lần nữa là dấu hiệu token đã
    bị đánh cắp → thu hồi toàn bộ token của người đó, không chỉ token này.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            raw_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.") from exc

    if payload.get("typ") != "refresh":
        raise UnauthorizedError("Token không phải refresh token.")

    # Khoá hàng: hai request `/auth/refresh` song song cùng một token (SPA hay
    # gửi song song lúc access token hết hạn) sẽ cùng đọc `revoked_at IS NULL`
    # và cùng phát token mới, hoặc tệ hơn là cùng kích hoạt phát hiện tái sử
    # dụng rồi đá người dùng ra khỏi mọi thiết bị.
    stored = db.scalar(
        select(RefreshToken).where(RefreshToken.jti == payload["jti"]).with_for_update()
    )
    if stored is None:
        raise UnauthorizedError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.")

    if stored.replaced_by is not None:
        replayed = _replay_within_grace(db, stored)
        if replayed is not None:
            return replayed

    if stored.revoked_at is not None or stored.replaced_by is not None:
        revoke_all_refresh_tokens(db, stored.user_id)
        # Commit trước khi raise: request này sẽ kết thúc bằng lỗi, và lớp
        # quản lý phiên rollback mọi request lỗi. Không commit ở đây thì việc
        # thu hồi bị huỷ theo và kẻ đang cầm token đánh cắp vẫn giữ được phiên
        # — đúng điều phát hiện tái sử dụng tồn tại để chặn.
        db.commit()
        raise UnauthorizedError(
            "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại."
        )

    if stored.expires_at <= now():
        raise UnauthorizedError("Phiên đăng nhập đã hết hạn.")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Tài khoản không còn hiệu lực.")

    new_jti = uuid.uuid4().hex
    new_expires = now() + timedelta(days=settings.refresh_token_days)
    db.add(RefreshToken(user_id=user.id, jti=new_jti, expires_at=new_expires))
    stored.replaced_by = new_jti
    stored.revoked_at = now()
    db.flush()
    return user, _refresh_jwt(new_jti, user.id, new_expires)


def revoke_all_refresh_tokens(db: Session, user_id: int) -> int:
    """Thu hồi mọi refresh token của một người. Gọi khi khoá tài khoản hoặc đổi
    mật khẩu — nếu không, "tài khoản bị khoá" là đúng nhưng vô nghĩa."""
    result = db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now())
    )
    return result.rowcount or 0


# --- Token đặt lại mật khẩu -------------------------------------------------


def _hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_password_reset(db: Session, user: User) -> str:
    """Sinh token đặt lại. Trả về giá trị thô **chỉ để gửi qua email** —
    không bao giờ đưa vào response API."""
    settings = get_settings()
    raw = secrets.token_urlsafe(32)
    db.add(
        PasswordReset(
            user_id=user.id,
            token_hash=_hash_reset_token(raw),
            expires_at=now() + timedelta(minutes=settings.password_reset_minutes),
        )
    )
    db.flush()
    return raw


def consume_password_reset(db: Session, raw_token: str) -> User:
    """Đổi token lấy người dùng và đánh dấu đã dùng. Dùng rồi là hỏng.

    Đánh dấu bằng **một câu UPDATE có điều kiện** rồi kiểm `rowcount`, không
    phải đọc-rồi-ghi: hai request đặt lại song song cùng một token sẽ cùng
    thấy `used_at IS NULL`, cả hai đổi mật khẩu, và mật khẩu cuối cùng là bất
    định — "dùng một lần" chỉ đúng khi không có ai bấm hai lần.
    """
    claimed = db.execute(
        update(PasswordReset)
        .where(
            PasswordReset.token_hash == _hash_reset_token(raw_token),
            PasswordReset.used_at.is_(None),
            PasswordReset.expires_at > now(),
        )
        .values(used_at=now())
        .returning(PasswordReset.user_id)
    ).scalar_one_or_none()

    if claimed is None:
        raise UnauthorizedError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.")

    user = db.get(User, claimed)
    if user is None or not user.is_active:
        raise UnauthorizedError("Tài khoản không còn hiệu lực.")
    return user
