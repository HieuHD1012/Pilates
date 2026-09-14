"""Phân quyền — cưỡng chế ở tầng dependency, không ở từng route thủ công.

Nguyên tắc: truy vấn của TRAINER và STUDENT **luôn kèm điều kiện lọc theo chủ
sở hữu ngay trong câu truy vấn**, không lấy hết rồi lọc sau. Lọc sau là cách
rò rỉ dữ liệu qua id trực tiếp — lỗi phổ biến nhất ở loại ứng dụng này.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy import Select, exists, select
from sqlalchemy.orm import Session

from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_access_token
from app.db import get_db
from app.domain.rules import HELD_BOOKING_STATUSES, Role, SessionStatus
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession
from app.models.user import User


@dataclass(frozen=True)
class Actor:
    """Người đang thao tác, kèm hồ sơ nghiệp vụ đã phân giải sẵn.

    `student_id` và `trainer_id` được nạp một lần ở đây để mọi chỗ lọc theo
    chủ sở hữu dùng cùng một giá trị, thay vì mỗi API tự tra lại một kiểu.
    """

    user: User
    student_id: int | None = None
    trainer_id: int | None = None

    @property
    def id(self) -> int:
        return self.user.id

    @property
    def role(self) -> Role:
        return self.user.role

    @property
    def is_staff_or_admin(self) -> bool:
        return self.role in (Role.ADMIN, Role.STAFF)


def get_current_actor(request: Request, db: Session = Depends(get_db)) -> Actor:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise UnauthorizedError()

    payload = decode_access_token(header.removeprefix("Bearer ").strip())
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise UnauthorizedError("Tài khoản không còn hiệu lực.")

    student_id = None
    trainer_id = None
    if user.role is Role.STUDENT:
        student_id = db.scalar(select(Student.id).where(Student.user_id == user.id))
    elif user.role is Role.TRAINER:
        trainer_id = db.scalar(select(Trainer.id).where(Trainer.user_id == user.id))

    return Actor(user=user, student_id=student_id, trainer_id=trainer_id)


def require_roles(*roles: Role) -> Callable[[Actor], Actor]:
    """Dependency factory: chỉ cho các vai được liệt kê đi qua."""

    allowed = set(roles)

    def dependency(actor: Actor = Depends(get_current_actor)) -> Actor:
        if actor.role not in allowed:
            raise ForbiddenError()
        return actor

    return dependency


require_admin = require_roles(Role.ADMIN)
require_staff = require_roles(Role.ADMIN, Role.STAFF)
require_trainer = require_roles(Role.TRAINER)
require_student = require_roles(Role.STUDENT)


# --- Quyền trên dữ liệu học viên --------------------------------------------


def assert_can_read_student(actor: Actor, student_id: int) -> None:
    """Học viên, gói, thanh toán, sổ buổi: ADMIN/STAFF xem tất cả, STUDENT chỉ
    của mình, TRAINER không xem (ma trận quyền F01)."""
    if actor.is_staff_or_admin:
        return
    if actor.role is Role.STUDENT and actor.student_id == student_id:
        return
    raise ForbiddenError("Bạn chỉ xem được dữ liệu của chính mình.")


def scope_students(stmt: Select, actor: Actor) -> Select:
    """Ghim điều kiện chủ sở hữu vào câu truy vấn danh sách học viên."""
    if actor.is_staff_or_admin:
        return stmt
    if actor.role is Role.STUDENT and actor.student_id is not None:
        return stmt.where(Student.id == actor.student_id)
    raise ForbiddenError()


def is_assigned_trainer(db: Session, trainer_id: int, student_id: int) -> bool:
    """HLV có phụ trách học viên này không.

    Định nghĩa đang dùng: HLV đã hoặc đang dạy ít nhất một buổi mà học viên có
    đăng ký chưa bị hủy. Hệ thống không có bảng phân công riêng và một studio
    một cơ sở chưa cần tới nó.

    Đây là **mặc định an toàn** cho câu hỏi mở #2a (đáp án của khách ghi
    "Admin, HLV và học viên được xem" mà chưa nói rõ "HLV" là mọi HLV hay HLV
    phụ trách). Khi khách chốt rộng hơn thì chỉ sửa đúng hàm này.
    """
    return bool(
        db.scalar(
            select(
                exists().where(
                    Booking.student_id == student_id,
                    Booking.status.in_(HELD_BOOKING_STATUSES),
                    Booking.class_session_id == ClassSession.id,
                    ClassSession.trainer_id == trainer_id,
                )
            )
        )
    )


def assert_can_view_progress_photos(db: Session, actor: Actor, student_id: int) -> None:
    """Ảnh tiến trình: ADMIN, HLV phụ trách học viên đó, và chính học viên đó.

    **STAFF bị từ chối** — đáp án câu 15 của khách không có STAFF, và đây là
    ảnh cơ thể của người thật, không phải dữ liệu vận hành.
    """
    if actor.role is Role.ADMIN:
        return
    if actor.role is Role.STUDENT and actor.student_id == student_id:
        return
    if (
        actor.role is Role.TRAINER
        and actor.trainer_id is not None
        and is_assigned_trainer(db, actor.trainer_id, student_id)
    ):
        return
    raise ForbiddenError("Bạn không có quyền xem ảnh tiến trình của học viên này.")


# --- Quyền trên lớp ---------------------------------------------------------


def assert_trainer_owns_session(db: Session, actor: Actor, class_session_id: int) -> None:
    """HLV chỉ thao tác trên lớp mình dạy. ADMIN/STAFF không bị giới hạn."""
    if actor.is_staff_or_admin:
        return
    if actor.role is not Role.TRAINER or actor.trainer_id is None:
        raise ForbiddenError()
    owns = db.scalar(
        select(
            exists().where(
                ClassSession.id == class_session_id,
                ClassSession.trainer_id == actor.trainer_id,
            )
        )
    )
    if not owns:
        raise ForbiddenError("Bạn chỉ thao tác được trên lớp mình dạy.")


def scope_class_sessions(stmt: Select, actor: Actor) -> Select:
    """Lọc lịch theo chủ sở hữu ngay trong truy vấn.

    STUDENT thấy mọi lớp còn hiệu lực (họ cần chọn lớp để đăng ký); TRAINER chỉ
    thấy lớp mình dạy; ADMIN/STAFF thấy tất cả.
    """
    if actor.is_staff_or_admin:
        return stmt
    if actor.role is Role.TRAINER:
        if actor.trainer_id is None:
            raise ForbiddenError("Tài khoản HLV chưa được nối với hồ sơ huấn luyện viên.")
        return stmt.where(ClassSession.trainer_id == actor.trainer_id)
    return stmt.where(ClassSession.status == SessionStatus.SCHEDULED)
