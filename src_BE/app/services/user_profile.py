"""Cập nhật tài khoản và hồ sơ liên kết của chính người đăng nhập."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.content_rules import clean_public_text, sanitize_plain_text
from app.core.errors import BusinessError, ForbiddenError, UnauthorizedError, ValidationError
from app.core.permissions import Actor
from app.domain.rules import Role, normalize_phone
from app.models.people import Student, Trainer
from app.models.user import User
from app.schemas.auth import UpdateMeRequest


def update_profile(db: Session, actor: Actor, payload: UpdateMeRequest) -> None:
    user = db.scalar(
        select(User)
        .where(User.id == actor.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if user is None or not user.is_active:
        raise UnauthorizedError("Tài khoản không còn hiệu lực.")
    profile = None
    if actor.role in (Role.STUDENT, Role.TRAINER):
        model = Student if actor.role is Role.STUDENT else Trainer
        profile = db.scalar(
            select(model)
            .where(model.user_id == user.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if profile is None:
            raise ForbiddenError("Tài khoản chưa được nối với hồ sơ.")
    fields = payload.model_dump(exclude_unset=True)
    if "full_name" in fields:
        if fields["full_name"] is None:
            raise ValidationError("Tên không được để trống.", "NAME_REQUIRED")
        fields["full_name"] = (
            clean_public_text(
                fields["full_name"], field="full_name", max_length=120, allow_empty=False
            )
            if profile is not None
            else sanitize_plain_text(fields["full_name"], 120, "full_name")
        )
        if not fields["full_name"].strip():
            raise ValidationError("Tên không được để trống.", "NAME_REQUIRED")
    if "phone" in fields and fields["phone"] is not None:
        fields["phone"] = normalize_phone(fields["phone"])
        if not fields["phone"]:
            raise ValidationError("Số điện thoại không được để trống.", "PHONE_REQUIRED")
    if isinstance(profile, Student) and "phone" in fields:
        if fields["phone"] is None:
            raise ValidationError("Số điện thoại học viên không được để trống.", "PHONE_REQUIRED")
        if (
            db.scalar(
                select(Student.id).where(Student.phone == fields["phone"], Student.id != profile.id)
            )
            is not None
        ):
            raise BusinessError("STUDENT_PHONE_TAKEN", "Số điện thoại đã được sử dụng.")
    try:
        with db.begin_nested():
            for field, value in fields.items():
                setattr(user, field, value)
                if profile is not None:
                    setattr(profile, field, value)
            db.flush()
    except IntegrityError as exc:
        if "student_phone_key" not in str(exc.orig):
            raise
        raise BusinessError("STUDENT_PHONE_TAKEN", "Số điện thoại đã được sử dụng.") from exc
