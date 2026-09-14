"""Loại gói, bán gói, sổ buổi và điều chỉnh số buổi (F05)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.content_rules import clean_public_text
from app.core.errors import ForbiddenError, NotFoundError
from app.core.permissions import (
    Actor,
    assert_can_read_student,
    get_current_actor,
    require_admin,
    require_staff,
)
from app.db import get_db
from app.domain.rules import ClassType
from app.models.money import PackageType, StudentPackage
from app.schemas.money import (
    AdjustCreditsRequest,
    LedgerEntryResponse,
    PackageLedgerResponse,
    PackageTypeCreate,
    PackageTypeResponse,
    PackageTypeUpdate,
    RenewPackageRequest,
    SellPackageRequest,
    StudentPackageResponse,
)
from app.services import credit_ledger, package_sales

types_router = APIRouter(
    prefix="/package-types", tags=["packages"], dependencies=[Depends(require_staff)]
)
router = APIRouter(prefix="/packages", tags=["packages"])


def _get_package_type(db: Session, package_type_id: int) -> PackageType:
    package_type = db.get(PackageType, package_type_id)
    if package_type is None:
        raise NotFoundError("Không tìm thấy loại gói.")
    return package_type


def _get_student_package(db: Session, package_id: int) -> StudentPackage:
    package = db.get(StudentPackage, package_id)
    if package is None:
        raise NotFoundError("Không tìm thấy gói tập.")
    return package


# --- Loại gói ----------------------------------------------------------------


@types_router.get("", response_model=list[PackageTypeResponse])
def list_package_types(
    db: Session = Depends(get_db),
    class_type: ClassType | None = None,
    is_selling: bool | None = None,
) -> list[PackageType]:
    """Danh mục gói tập đang bán."""
    stmt = select(PackageType).order_by(PackageType.class_type, PackageType.name)
    if class_type is not None:
        stmt = stmt.where(PackageType.class_type == class_type)
    if is_selling is not None:
        stmt = stmt.where(PackageType.is_selling.is_(is_selling))
    return list(db.scalars(stmt))


@types_router.post("", response_model=PackageTypeResponse, status_code=201)
def create_package_type(
    payload: PackageTypeCreate, db: Session = Depends(get_db)
) -> PackageType:
    """Thêm một loại gói vào danh mục."""
    package_type = PackageType(
        # Tên gói hiển thị trên trang công khai nên đi qua validator nội dung.
        name=clean_public_text(
            payload.name, field="name", max_length=120, allow_empty=False
        ),
        price=payload.price,
        credits=payload.credits,
        duration_days=payload.duration_days,
        class_type=payload.class_type,
        is_selling=payload.is_selling,
    )
    db.add(package_type)
    db.flush()
    return package_type


@types_router.patch("/{package_type_id}", response_model=PackageTypeResponse)
def update_package_type(
    package_type_id: int, payload: PackageTypeUpdate, db: Session = Depends(get_db)
) -> PackageType:
    """Sửa loại gói.

    **Không chạm gói học viên đã mua** — những gói đó giữ snapshot riêng. Đổi
    giá hôm nay mà viết lại được lịch sử hôm qua thì mọi báo cáo doanh thu đều
    thành số liệu của hiện tại, không phải của kỳ đã qua.

    Ngừng bán chỉ đổi `is_selling`; bản ghi không bao giờ bị xoá vì gói đã bán
    còn tham chiếu tới nó.
    """
    package_type = _get_package_type(db, package_type_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        data["name"] = clean_public_text(
            data["name"], field="name", max_length=120, allow_empty=False
        )
    for field, value in data.items():
        setattr(package_type, field, value)
    return package_type


# --- Gói của học viên --------------------------------------------------------


@router.get("", response_model=list[StudentPackageResponse])
def list_student_packages(
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    student_id: int | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[StudentPackage]:
    """Gói của học viên.

    Học viên đăng nhập chỉ đọc được gói của chính mình; bỏ trống `student_id`
    thì hệ thống tự ghim vào họ thay vì trả về gói của cả studio.
    """
    if not actor.is_staff_or_admin:
        # Tài khoản học viên chưa nối hồ sơ là vấn đề quyền, không phải "không
        # tìm thấy": nói 404 ở đây là nói sai chuyện đang xảy ra.
        if actor.student_id is None:
            raise ForbiddenError("Tài khoản chưa được nối với hồ sơ học viên.")
        student_id = actor.student_id
    if student_id is None:
        raise NotFoundError("Cần chỉ định học viên.")
    assert_can_read_student(actor, student_id)

    return list(
        db.scalars(
            select(StudentPackage)
            .where(StudentPackage.student_id == student_id)
            .order_by(StudentPackage.end_date.desc(), StudentPackage.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )


@router.post("/sell", response_model=StudentPackageResponse, status_code=201)
def sell_package(
    payload: SellPackageRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> StudentPackage:
    """Bán gói cho học viên — tạo gói và cộng buổi trong **một transaction**."""
    package_type = _get_package_type(db, payload.package_type_id)
    return package_sales.sell_package(
        db,
        student_id=payload.student_id,
        spec=package_sales.spec_from_package_type(package_type, payload.start_date),
        actor_user_id=actor.id,
        package_type_id=package_type.id,
    )


@router.post("/{package_id}/renew", response_model=StudentPackageResponse)
def renew_package(
    package_id: int,
    payload: RenewPackageRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> StudentPackage:
    """Gia hạn một gói đang có: cộng buổi và đẩy ngày hết hạn.

    Buổi gia hạn ghi vào sổ như một bút toán riêng, nên vẫn phân biệt được với
    buổi của lần bán đầu.
    """
    return package_sales.renew_package(
        db,
        student_package_id=package_id,
        extra_days=payload.extra_days,
        extra_credits=payload.extra_credits,
        actor_user_id=actor.id,
        note=payload.note,
    )


@router.get("/{package_id}/ledger", response_model=PackageLedgerResponse)
def get_package_ledger(
    package_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> PackageLedgerResponse:
    """Sổ buổi của **một gói của một học viên** — không phải sổ chung toàn studio.

    Gói của người khác trả 404 giống hệt gói không tồn tại: hai mã khác nhau
    cho hai trường hợp là một bộ đếm số gói của studio.
    """
    package = db.get(StudentPackage, package_id)
    if package is None or (
        not actor.is_staff_or_admin and package.student_id != actor.student_id
    ):
        raise NotFoundError("Không tìm thấy gói tập.")

    rows = credit_ledger.running_balance(db, package_id)
    return PackageLedgerResponse(
        student_package_id=package_id,
        entries=[
            LedgerEntryResponse(
                id=entry.id,
                delta=entry.delta,
                balance_after=balance,
                reason_code=entry.reason_code,
                note=entry.note,
                booking_id=entry.booking_id,
                actor_user_id=entry.actor_user_id,
                created_at=entry.created_at,
            )
            for entry, balance in rows
        ],
        closing_balance=rows[-1][1] if rows else 0,
    )


@router.post("/{package_id}/adjust", response_model=StudentPackageResponse)
def adjust_credits(
    package_id: int,
    payload: AdjustCreditsRequest,
    actor: Actor = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StudentPackage:
    """Điều chỉnh số buổi thủ công — **chỉ ADMIN**, bắt buộc lý do."""
    return package_sales.adjust_credits(
        db,
        student_package_id=package_id,
        delta=payload.delta,
        reason_note=payload.reason,
        actor_user_id=actor.id,
    )
