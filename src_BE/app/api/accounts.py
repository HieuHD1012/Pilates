"""Quản lý tài khoản — chỉ ADMIN."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import security
from app.core.email import send_password_reset
from app.core.errors import BusinessError, NotFoundError, ValidationError
from app.core.permissions import Actor, require_admin
from app.db import get_db
from app.domain.rules import Role, UserStatus
from app.models.people import Student, Trainer
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from app.schemas.auth import MessageResponse

router = APIRouter(prefix="/accounts", tags=["accounts"], dependencies=[Depends(require_admin)])


def _get_or_404(db: Session, account_id: int) -> User:
    user = db.get(User, account_id)
    if user is None:
        raise NotFoundError("Không tìm thấy tài khoản.")
    return user


def _student_for_link(db: Session, student_id: int, account_id: int | None = None) -> Student:
    student = db.scalar(
        select(Student)
        .where(Student.id == student_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if student is None:
        raise NotFoundError("Không tìm thấy học viên.")
    if student.user_id is not None and student.user_id != account_id:
        raise BusinessError("STUDENT_HAS_ACCOUNT", "Học viên này đã được cấp tài khoản.")
    return student


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    role: Role | None = None,
    is_active: bool | None = None,
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[User]:
    """Danh sách tài khoản đăng nhập của studio."""
    stmt = select(User).order_by(User.id).limit(limit).offset(offset)
    if role is not None:
        stmt = stmt.where(User.role == role)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))
    if q:
        stmt = stmt.where(User.email.ilike(f"%{q}%"))
    return list(db.scalars(stmt))


@router.post("", response_model=AccountResponse, status_code=201)
def create_account(
    payload: AccountCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> User:
    """Admin cấp tài khoản. STUDENT bắt buộc có student_id của hồ sơ đã tạo.

    Tạo tài khoản và nối hồ sơ trong cùng giao dịch. Học viên không tự đăng ký.
    Bỏ password thì gửi liên kết để học viên tự đặt mật khẩu.
    HLV được nối hồ sơ qua POST/PATCH /trainers bằng user_id.
    """
    student = None
    if payload.role is Role.STUDENT:
        if payload.student_id is None:
            raise ValidationError("Cần chọn hồ sơ học viên để cấp tài khoản.", "STUDENT_REQUIRED")
        student = _student_for_link(db, payload.student_id)
    elif payload.student_id is not None:
        raise ValidationError(
            "Chỉ tài khoản STUDENT được nối hồ sơ học viên.", "ACCOUNT_ROLE_MISMATCH"
        )
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        password_hash=security.hash_password(payload.password) if payload.password else None,
        status=UserStatus.ACTIVE if payload.password else UserStatus.PENDING_ACTIVATION,
    )
    db.add(user)
    try:
        # Để ràng buộc UNIQUE phán quyết thay vì đọc-rồi-ghi: hai admin tạo
        # cùng một email đồng thời đều thấy "chưa tồn tại", rồi một trong hai
        # vấp IntegrityError và nhận 500 thay vì một thông báo dùng được.
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise ValidationError("Email này đã có tài khoản.", code="EMAIL_TAKEN") from exc

    if student is not None:
        student.user_id = user.id
        db.flush()

    if payload.password is None:
        raw_token = security.create_password_reset(db, user)
        # Commit trước khi xếp hàng gửi thư: liên kết phải trỏ tới một token đã
        # thực sự nằm trong CSDL.
        db.commit()
        background.add_task(send_password_reset, user.email, raw_token)
    return user


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, db: Session = Depends(get_db)) -> User:
    """Chi tiết một tài khoản."""
    return _get_or_404(db, account_id)


@router.patch("/{account_id}", response_model=AccountResponse)
def update_account(account_id: int, payload: AccountUpdate, db: Session = Depends(get_db)) -> User:
    """Sửa hồ sơ tài khoản.

    Từ chối mọi trường lạ bằng 422 — cố ý. Khoá tài khoản đi bằng
    `POST /accounts/{id}/lock`, không phải bằng `is_active` ở đây: một màn hình
    gửi `{"is_active": false}` rồi nhận 200 và hiện "đã lưu" trong khi tài khoản
    vẫn mở là kiểu hỏng tệ nhất.
    """
    user = db.scalar(
        select(User)
        .where(User.id == account_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if user is None:
        raise NotFoundError("Không tìm thấy tài khoản.")
    fields = payload.model_dump(exclude_unset=True)
    if "role" in fields and payload.role is None:
        raise ValidationError("Vai tài khoản không được để trống.", "ACCOUNT_ROLE_MISMATCH")
    target_role = payload.role if "role" in fields else user.role
    linked_student = db.scalar(select(Student.id).where(Student.user_id == user.id))
    linked_trainer = db.scalar(select(Trainer.id).where(Trainer.user_id == user.id))
    if target_role is Role.STUDENT and linked_student is None and "role" in fields:
        if payload.student_id is None:
            raise ValidationError("Cần chọn hồ sơ học viên để đổi vai STUDENT.", "STUDENT_REQUIRED")
    if (linked_student is not None and target_role is not Role.STUDENT) or (
        linked_trainer is not None and target_role is not Role.TRAINER
    ):
        raise ValidationError(
            "Không đổi vai của tài khoản đang nối hồ sơ.", "ACCOUNT_ROLE_MISMATCH"
        )
    if "student_id" in fields:
        if target_role is not Role.STUDENT:
            raise ValidationError(
                "Chỉ tài khoản STUDENT được nối hồ sơ học viên.", "ACCOUNT_ROLE_MISMATCH"
            )
        if payload.student_id is None:
            raise ValidationError("Không được bỏ liên kết hồ sơ học viên.", "STUDENT_REQUIRED")
        if linked_student is not None and linked_student != payload.student_id:
            raise BusinessError("ACCOUNT_ALREADY_LINKED", "Tài khoản đã nối một học viên khác.")
        student = _student_for_link(db, payload.student_id, user.id)
        student.user_id = user.id
    for field, value in fields.items():
        if field == "student_id":
            continue
        setattr(user, field, value)
    return user


@router.post("/{account_id}/lock", response_model=MessageResponse)
def lock_account(
    account_id: int,
    actor: Actor = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Khoá tài khoản và thu hồi mọi phiên đang mở.

    Thu hồi refresh token là phần bắt buộc: không có nó, người bị khoá vẫn cầm
    refresh token và tiếp tục phát access token tới khi token hết hạn.
    """
    if account_id == actor.id:
        raise BusinessError("CANNOT_LOCK_SELF", "Không thể tự khoá tài khoản của mình.")

    user = _get_or_404(db, account_id)
    user.is_active = False
    revoked = security.revoke_all_refresh_tokens(db, user.id)
    return MessageResponse(message=f"Đã khoá tài khoản và thu hồi {revoked} phiên đăng nhập.")


@router.post("/{account_id}/unlock", response_model=MessageResponse)
def unlock_account(account_id: int, db: Session = Depends(get_db)) -> MessageResponse:
    """Mở khoá tài khoản đã bị khoá."""
    user = _get_or_404(db, account_id)
    user.is_active = True
    return MessageResponse(message="Đã mở khoá tài khoản.")


@router.post("/{account_id}/send-password-reset", response_model=MessageResponse)
def send_reset_link(
    account_id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """Gửi lại liên kết đặt mật khẩu. Token chỉ đi qua email, không trả về đây."""
    user = _get_or_404(db, account_id)
    raw_token = security.create_password_reset(db, user)
    db.commit()
    background.add_task(send_password_reset, user.email, raw_token)
    return MessageResponse(message="Đã gửi liên kết đặt lại mật khẩu.")
