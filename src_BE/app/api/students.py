"""Quản lý hồ sơ học viên (F03)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.content_rules import clean_public_text, sanitize_plain_text
from app.core.errors import BusinessError, NotFoundError
from app.core.permissions import (
    Actor,
    assert_can_read_student,
    get_current_actor,
    require_staff,
    scope_students,
)
from app.db import get_db
from app.domain.rules import StudentStatus, normalize_phone
from app.models.people import Student
from app.schemas.people import (
    PackageSummary,
    StudentCreate,
    StudentOverview,
    StudentResponse,
    StudentUpdate,
)
from app.services.credit_balance import active_packages

router = APIRouter(prefix="/students", tags=["students"])


def _get_or_404(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise NotFoundError("Không tìm thấy học viên.")
    return student


def _assert_phone_free(db: Session, phone: str, exclude_id: int | None = None) -> None:
    """Chặn số điện thoại trùng và **chỉ ra hồ sơ đang giữ số đó**.

    Chỉ báo "số đã tồn tại" thì nhân viên phải tự đi tìm; nêu tên và id thì họ
    mở thẳng hồ sơ đó ra xem có phải cùng một người không.
    """
    stmt = select(Student).where(Student.phone == phone)
    if exclude_id is not None:
        stmt = stmt.where(Student.id != exclude_id)
    existing = db.scalar(stmt)
    if existing is not None:
        raise BusinessError(
            "STUDENT_PHONE_TAKEN",
            f"Số điện thoại {phone} đã thuộc học viên "
            f"#{existing.id} ({existing.full_name}).",
        )


@router.get("", response_model=list[StudentResponse])
def list_students(
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    status: StudentStatus | None = None,
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Student]:
    """Danh sách học viên.

    `scope_students` ghim điều kiện chủ sở hữu **vào câu truy vấn**: học viên
    đăng nhập chỉ lấy được hàng của chính mình, chứ không phải lấy hết rồi lọc
    ở tầng Python — lọc sau là cách danh sách rò rỉ khi ai đó quên một nhánh.
    """
    stmt = select(Student).order_by(Student.full_name)
    stmt = scope_students(stmt, actor)
    if status is not None:
        stmt = stmt.where(Student.status == status)
    if q:
        stmt = stmt.where(Student.full_name.ilike(f"%{q}%") | Student.phone.ilike(f"%{q}%"))
    return list(db.scalars(stmt.limit(limit).offset(offset)))


@router.post("", response_model=StudentResponse, status_code=201)
def create_student(
    payload: StudentCreate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Student:
    """Thêm học viên. Số điện thoại là khoá nhận diện nên không được trùng."""
    phone = normalize_phone(payload.phone)
    _assert_phone_free(db, phone)

    student = Student(
        # `full_name` là trường NOT NULL: `<script>…</script>` qua được
        # `min_length=1` của Pydantic nhưng làm sạch xong thì không còn gì, và
        # ghi NULL vào cột NOT NULL biến một đầu vào đáng 422 thành 500.
        full_name=clean_public_text(
            payload.full_name, field="full_name", max_length=120, allow_empty=False
        ),
        phone=phone,
        email=payload.email,
        dob=payload.dob,
        note=sanitize_plain_text(payload.note, 2000, "note"),
    )
    db.add(student)
    try:
        # SAVEPOINT chứ không phải rollback cả transaction: `db.rollback()` ở
        # đây sẽ huỷ luôn mọi việc khác trong cùng request — hiện chưa có việc
        # nào, nhưng F05 sẽ gộp bán gói vào cùng luồng này.
        with db.begin_nested():
            db.flush()
    except IntegrityError as exc:
        # Hai nhân viên tạo cùng một số đồng thời: kiểm trước đó đều thấy trống.
        raise BusinessError(
            "STUDENT_PHONE_TAKEN", f"Số điện thoại {phone} vừa được dùng cho hồ sơ khác."
        ) from exc
    return student


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> Student:
    """Chi tiết một học viên. Học viên chỉ đọc được hồ sơ của chính mình."""
    assert_can_read_student(actor, student_id)
    return _get_or_404(db, student_id)


@router.get("/{student_id}/overview", response_model=StudentOverview)
def get_student_overview(
    student_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> StudentOverview:
    """Tổng quan: số buổi còn lại và các gói đang hoạt động.

    Số buổi tính từ sổ `credit_ledger` và **chỉ gồm gói đang hoạt động**. Gói
    hết hạn còn buổi chưa dùng không bị thu hồi nhưng cũng không vào đây.
    """
    assert_can_read_student(actor, student_id)
    student = _get_or_404(db, student_id)

    balances = active_packages(db, student_id)
    return StudentOverview(
        student=StudentResponse.model_validate(student),
        credits_remaining=sum(item.credits_remaining for item in balances),
        active_packages=[
            PackageSummary(
                id=item.package.id,
                name=item.package.name_snapshot,
                class_type=item.package.class_type_snapshot,
                price=item.package.price_snapshot,
                start_date=item.package.start_date,
                end_date=item.package.end_date,
                credits_remaining=item.credits_remaining,
                days_remaining=item.days_remaining,
            )
            for item in balances
        ],
        needs_renewal=any(item.needs_renewal for item in balances),
    )


@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Student:
    """Sửa hồ sơ học viên."""
    student = _get_or_404(db, student_id)
    data = payload.model_dump(exclude_unset=True)

    if "phone" in data and data["phone"] is not None:
        data["phone"] = normalize_phone(data["phone"])
        _assert_phone_free(db, data["phone"], exclude_id=student_id)
    if "full_name" in data:
        data["full_name"] = clean_public_text(
            data["full_name"], field="full_name", max_length=120, allow_empty=False
        )
    if "note" in data:
        data["note"] = sanitize_plain_text(data["note"], 2000, "note")

    for field, value in data.items():
        setattr(student, field, value)
    return student
