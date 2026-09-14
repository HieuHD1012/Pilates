"""Quản lý hồ sơ huấn luyện viên (F04).

Thống kê số lớp và "Lịch dạy của tôi" **không** nằm ở đây: cả hai là hàm của
`class_session`, chưa tồn tại ở phase này, và được khép lại ở lần chạy hai
trong cửa sổ F06. Dựng số giả bây giờ để màn hình "trông đủ" là đúng thứ quy
tắc nội dung cấm.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.content_rules import clean_public_text
from app.core.errors import BusinessError, ForbiddenError, NotFoundError
from app.core.permissions import Actor, get_current_actor, require_staff
from app.core.upload_guard import (
    STORED_CONTENT_TYPE,
    delete_image,
    prepare_image,
    read_image,
    read_upload,
    write_prepared,
)
from app.db import get_db
from app.domain.rules import Role
from app.models.people import Trainer
from app.schemas.people import TrainerCreate, TrainerResponse, TrainerUpdate

router = APIRouter(prefix="/trainers", tags=["trainers"])


def _get_or_404(db: Session, trainer_id: int, actor: Actor) -> Trainer:
    """Lấy hồ sơ HLV **đã ghim phạm vi của người gọi**.

    Với vai TRAINER, truy vấn chỉ nhìn thấy hồ sơ của chính họ, nên id người
    khác và id không tồn tại đều trả 404. Tra trước rồi mới kiểm quyền thì hai
    trường hợp trả hai mã khác nhau, và đó là một bộ đếm số HLV của studio.
    """
    stmt = select(Trainer).where(Trainer.id == trainer_id)
    if not actor.is_staff_or_admin:
        if actor.role is not Role.TRAINER or actor.trainer_id is None:
            raise ForbiddenError()
        stmt = stmt.where(Trainer.id == actor.trainer_id)

    trainer = db.scalar(stmt)
    if trainer is None:
        raise NotFoundError("Không tìm thấy huấn luyện viên.")
    return trainer


#: Ba trường của hồ sơ HLV được hiển thị nguyên văn trên trang công khai.
#: `full_name` là trường lộ diện nhất trong ba — bỏ sót nó nghĩa là vừa có một
#: đường XSS lưu trữ lên trang marketing, vừa có một cửa để "Chứng chỉ Polestar"
#: đi vòng qua validator bằng cách nằm trong tên.
_PUBLIC_PROFILE_FIELDS = {
    "full_name": {"max_length": 120, "allow_empty": False},
    "bio": {"max_length": 4000, "allow_empty": True},
    "specialties": {"max_length": 1000, "allow_empty": True},
}


def _clean_public_profile_fields(data: dict) -> dict:
    """Làm sạch và kiểm P3 mọi trường hồ sơ đi ra trang công khai.

    Đây là đường nội dung bịa lọt ra ngoài sau go-live, nên phải qua validator
    **khi ghi** chứ không chỉ rà thủ công trước nghiệm thu.
    """
    for field, options in _PUBLIC_PROFILE_FIELDS.items():
        if field in data:
            data[field] = clean_public_text(data[field], field=field, **options)
    return data


@router.get("", response_model=list[TrainerResponse])
def list_trainers(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    is_active: bool | None = None,
    is_public: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Trainer]:
    """Danh sách huấn luyện viên cho màn quản trị."""
    stmt = select(Trainer).order_by(Trainer.full_name)
    if is_active is not None:
        stmt = stmt.where(Trainer.is_active.is_(is_active))
    if is_public is not None:
        stmt = stmt.where(Trainer.is_public.is_(is_public))
    return list(db.scalars(stmt.limit(limit).offset(offset)))


@router.post("", response_model=TrainerResponse, status_code=201)
def create_trainer(
    payload: TrainerCreate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Trainer:
    """Thêm hồ sơ huấn luyện viên."""
    data = _clean_public_profile_fields(payload.model_dump())
    trainer = Trainer(**data)
    db.add(trainer)
    db.flush()
    return trainer


@router.get("/{trainer_id}", response_model=TrainerResponse)
def get_trainer(
    trainer_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> Trainer:
    """Chi tiết HLV.

    HLV mở được hồ sơ của chính mình; id của người khác trả 404 giống hệt id
    không tồn tại — rò rỉ qua id trực tiếp là lỗi phổ biến nhất ở loại ứng dụng
    này, và hai mã trả về khác nhau là một bộ đếm số HLV của studio.
    """
    trainer = _get_or_404(db, trainer_id, actor)
    return trainer


@router.patch("/{trainer_id}", response_model=TrainerResponse)
def update_trainer(
    trainer_id: int,
    payload: TrainerUpdate,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> Trainer:
    """Sửa hồ sơ huấn luyện viên.

    HLV sửa được phần giới thiệu của chính mình, nhưng không tự bật mình lên
    trang công khai và không tự gắn hồ sơ sang tài khoản khác.
    """
    trainer = _get_or_404(db, trainer_id, actor)

    data = _clean_public_profile_fields(payload.model_dump(exclude_unset=True))
    if not actor.is_staff_or_admin:
        # HLV sửa được phần giới thiệu của mình, nhưng không tự bật mình lên
        # trang công khai, không tự mở lại tài khoản đã ngừng hoạt động, và
        # không tự gắn hồ sơ sang tài khoản khác.
        for field in ("is_public", "is_active", "user_id"):
            data.pop(field, None)

    for field, value in data.items():
        setattr(trainer, field, value)
    return trainer


@router.post("/{trainer_id}/photo", response_model=TrainerResponse)
def upload_trainer_photo(
    trainer_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> Trainer:
    """Tải ảnh HLV.

    Ảnh được giải mã rồi mã hoá lại nên metadata rơi ra hết, và lưu dưới khoá
    ngẫu nhiên.

    Thứ tự ở đây quan trọng: kiểm ảnh → cập nhật hàng và **commit** → rồi mới
    ghi tệp mới và xoá tệp cũ. Xoá trước khi commit thì một lần rollback để lại
    `photo_key` trỏ vào tệp đã biến mất, và hồ sơ mất ảnh mà không ai biết.
    """
    trainer = _get_or_404(db, trainer_id, actor)

    prepared = prepare_image(read_upload(file), prefix="trainer")
    previous = trainer.photo_key
    trainer.photo_key = prepared.storage_key
    db.commit()

    write_prepared(prepared)
    if previous:
        delete_image(previous)
    return trainer


@router.get("/{trainer_id}/photo")
def get_trainer_photo(
    trainer_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> Response:
    """Ảnh đại diện HLV dạng nhị phân. Trả 404 kèm mã `NO_PHOTO` khi chưa có ảnh."""
    trainer = _get_or_404(db, trainer_id, actor)
    if not trainer.photo_key:
        raise BusinessError(
            "NO_PHOTO", "Huấn luyện viên này chưa có ảnh.", http_status=404
        )
    return Response(content=read_image(trainer.photo_key), media_type=STORED_CONTENT_TYPE)
