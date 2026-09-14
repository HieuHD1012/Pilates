"""Dựng dữ liệu cho test đăng ký lớp.

Gom về một chỗ vì bốn bộ test của F07 cần đúng cùng một bối cảnh: một học viên
có tài khoản, một gói còn hiệu lực, một buổi lớp sắp diễn ra. Mỗi file tự dựng
lấy là mỗi file tự chọn một biến thể hơi khác, và khi một test đỏ thì mất thêm
một vòng nữa chỉ để biết khác ở chỗ nào.
"""

from __future__ import annotations

import itertools
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.permissions import Actor
from app.domain.rules import ClassType, Role, today
from app.models.money import StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import ClassSession
from app.models.user import User
from app.services.package_sales import PackageSpec, sell_package
from tests.conftest import make_user

#: Bộ đếm không giới hạn: số điện thoại là `UNIQUE`, và một dãy hữu hạn sẽ
#: cạn giữa chừng khi bộ test lớn dần — hỏng ở một chỗ không liên quan gì đến
#: điều đang được kiểm.
_PHONE_SEQ = itertools.count(1)


def next_phone() -> str:
    return f"09{next(_PHONE_SEQ):08d}"


def actor_for(db: Session, user: User) -> Actor:
    """`Actor` giống hệt cái dependency dựng ra, gồm cả hồ sơ nghiệp vụ.

    Test gọi thẳng service phải dùng cùng một `Actor` với đường HTTP, nếu không
    nó đang kiểm một phép phân quyền khác với phép chạy thật.
    """
    from sqlalchemy import select

    student_id = None
    trainer_id = None
    if user.role is Role.STUDENT:
        student_id = db.scalar(select(Student.id).where(Student.user_id == user.id))
    elif user.role is Role.TRAINER:
        trainer_id = db.scalar(select(Trainer.id).where(Trainer.user_id == user.id))
    return Actor(user=user, student_id=student_id, trainer_id=trainer_id)


def make_trainer(
    db: Session, name: str = "HLV Mai Anh", *, user: User | None = None
) -> Trainer:
    trainer = Trainer(full_name=name, user_id=user.id if user else None)
    db.add(trainer)
    db.commit()
    return trainer


def make_student(
    db: Session,
    name: str = "Học viên Lan",
    *,
    user: User | None = None,
    phone: str | None = None,
) -> Student:
    student = Student(
        full_name=name, phone=phone or next_phone(), user_id=user.id if user else None
    )
    db.add(student)
    db.commit()
    return student


def make_student_account(
    db: Session, name: str = "Học viên Lan", email: str | None = None
) -> tuple[Student, User]:
    user = make_user(db, Role.STUDENT, email=email or f"{next_phone()}@example.com")
    return make_student(db, name, user=user), user


def give_package(
    db: Session,
    student: Student,
    actor_user_id: int,
    *,
    credits: int = 10,
    class_type: ClassType = ClassType.GROUP,
    start_offset_days: int = -1,
    end_offset_days: int = 60,
    name: str = "Gói 10 buổi",
) -> StudentPackage:
    package = sell_package(
        db,
        student_id=student.id,
        spec=PackageSpec(
            name=name,
            price=Decimal("2500000.00"),
            credits=credits,
            class_type=class_type,
            start_date=today() + timedelta(days=start_offset_days),
            end_date=today() + timedelta(days=end_offset_days),
        ),
        actor_user_id=actor_user_id,
    )
    db.commit()
    return package


def make_session(
    db: Session,
    trainer: Trainer,
    actor_user_id: int,
    *,
    starts_at: datetime,
    capacity: int = 6,
    class_type: ClassType = ClassType.GROUP,
    duration_hours: int = 1,
) -> ClassSession:
    class_session = ClassSession(
        starts_at=starts_at,
        ends_at=starts_at + timedelta(hours=duration_hours),
        trainer_id=trainer.id,
        class_type=class_type,
        capacity=capacity,
        created_by=actor_user_id,
    )
    db.add(class_session)
    db.commit()
    return class_session
