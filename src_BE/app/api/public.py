"""Endpoint công khai — chỉ đọc, không xác thực.

Mọi response ở đây đi qua model trong `app/schemas/public.py`. Không bao giờ
trả model nội bộ: đó là đường lộ số điện thoại HLV và danh tính học viên.
"""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ValidationError
from app.core.upload_guard import STORED_CONTENT_TYPE, read_image
from app.db import get_db
from app.domain.rules import BookingStatus, SessionStatus, now
from app.models.money import PackageType
from app.models.people import Announcement, Trainer
from app.models.scheduling import Booking, ClassSession
from app.schemas.public import (
    PublicAnnouncement,
    PublicClassSession,
    PublicPackage,
    PublicTrainer,
)

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/trainers", response_model=list[PublicTrainer])
def list_public_trainers(db: Session = Depends(get_db)) -> list[PublicTrainer]:
    """Đội ngũ HLV công khai.

    `is_public` quyết định ai xuất hiện; `is_active` loại người đã nghỉ. Chọn
    tường minh từng cột thay vì lấy cả hàng — trường không được đọc lên thì
    không thể lọt vào response do sơ ý.
    """
    rows = db.execute(
        select(Trainer.full_name, Trainer.photo_key, Trainer.bio)
        .where(Trainer.is_public.is_(True), Trainer.is_active.is_(True))
        .order_by(Trainer.full_name)
    ).all()
    return [
        PublicTrainer(full_name=full_name, photo_key=photo_key, bio=bio)
        for full_name, photo_key, bio in rows
    ]


@router.get("/announcements", response_model=list[PublicAnnouncement])
def list_public_announcements(
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[PublicAnnouncement]:
    """Thông báo đã đăng.

    `publish_at` ở tương lai thì chưa hiện — hẹn giờ đăng mà vẫn lộ ngay thì
    cái hẹn giờ vô nghĩa.
    """
    moment = now()
    rows = db.execute(
        select(Announcement.title, Announcement.body, Announcement.publish_at)
        .where(
            Announcement.is_published.is_(True),
            (Announcement.publish_at.is_(None)) | (Announcement.publish_at <= moment),
        )
        .order_by(Announcement.publish_at.desc().nullslast(), Announcement.id.desc())
        .limit(limit)
    ).all()
    return [
        PublicAnnouncement(title=title, body=body, publish_at=publish_at)
        for title, body, publish_at in rows
    ]


@router.get("/packages", response_model=list[PublicPackage])
def list_public_packages(db: Session = Depends(get_db)) -> list[PublicPackage]:
    """Gói tập đang bán.

    Giá hiện **khi studio đã cung cấp**. Chưa có thì trả `null` để giao diện
    dựng trạng thái rỗng có nhãn — không thay bằng 0, vì 0 là một con số và nó
    nói sai.
    """
    rows = db.execute(
        select(
            PackageType.name,
            PackageType.price,
            PackageType.credits,
            PackageType.duration_days,
            PackageType.class_type,
        )
        .where(PackageType.is_selling.is_(True))
        .order_by(PackageType.class_type, PackageType.price)
    ).all()
    return [
        PublicPackage(
            name=name,
            price=str(price) if price is not None else None,
            credits=credits,
            duration_days=duration_days,
            class_type=class_type,
        )
        for name, price, credits, duration_days, class_type in rows
    ]


@router.get("/schedule", response_model=list[PublicClassSession])
def list_public_schedule(
    db: Session = Depends(get_db),
    days: int = Query(default=14, ge=1, le=60),
) -> list[PublicClassSession]:
    """Lịch lớp công khai — lần chạy hai của F02, khép lại trong cửa sổ F06.

    Hiển thị các buổi **đã được xếp** là hợp lệ: đó là sự kiện có thật, khác
    hẳn một lời hứa như "giờ mở cửa 7:30–19:30" mà chưa ai cung cấp.

    `is_full` là **boolean**, không phải số chỗ còn lại. Số chỗ đủ để suy ra
    lớp nào vắng, và "lớp 6h sáng thứ Ba chỉ có 1 người" là thông tin không nên
    công khai ở một studio nhỏ — đây là chuyện an toàn thân thể, không chỉ là
    quyền riêng tư.
    """
    moment = now()
    horizon = moment + timedelta(days=days)
    # Giới hạn theo khoảng ngày ngay trong subquery: không có nó, endpoint ẩn
    # danh này gom toàn bộ bảng `booking` mỗi lần được gọi.
    booked = (
        select(
            Booking.class_session_id.label("session_id"),
            func.count().label("taken"),
        )
        .join(ClassSession, ClassSession.id == Booking.class_session_id)
        .where(
            Booking.status == BookingStatus.BOOKED,
            ClassSession.starts_at >= moment,
            ClassSession.starts_at < horizon,
        )
        .group_by(Booking.class_session_id)
        .subquery()
    )

    rows = db.execute(
        select(
            ClassSession.starts_at,
            ClassSession.ends_at,
            ClassSession.class_type,
            Trainer.full_name,
            ClassSession.capacity,
            func.coalesce(booked.c.taken, 0),
        )
        .join(Trainer, Trainer.id == ClassSession.trainer_id)
        .outerjoin(booked, booked.c.session_id == ClassSession.id)
        .where(
            ClassSession.status == SessionStatus.SCHEDULED,
            ClassSession.starts_at >= moment,
            ClassSession.starts_at < horizon,
        )
        .order_by(ClassSession.starts_at)
    ).all()

    return [
        PublicClassSession(
            starts_at=starts_at,
            ends_at=ends_at,
            class_type=class_type,
            trainer_name=trainer_name,
            is_full=taken >= capacity,
        )
        for starts_at, ends_at, class_type, trainer_name, capacity, taken in rows
    ]


@router.get("/trainer-photos/{prefix}/{key}")
def get_public_trainer_photo(
    prefix: str, key: str, db: Session = Depends(get_db)
) -> Response:
    """Ảnh HLV công khai.

    Chỉ phục vụ khoá đang gắn với một HLV **đang công khai**: ảnh của HLV đã
    gỡ khỏi trang phải biến mất theo, chứ không sống tiếp nhờ ai đó còn giữ
    đường dẫn.
    """
    storage_key = f"{prefix}/{key}"
    exists = db.scalar(
        select(Trainer.id).where(
            Trainer.photo_key == storage_key,
            Trainer.is_public.is_(True),
            Trainer.is_active.is_(True),
        )
    )
    if exists is None:
        return Response(status_code=404)

    try:
        content = read_image(storage_key)
    except ValidationError:
        # Hàng còn trỏ tệp nhưng tệp đã mất: với người xem trang công khai thì
        # đơn giản là không có ảnh, không phải một lỗi đầu vào của họ.
        return Response(status_code=404)

    return Response(
        content=content,
        media_type=STORED_CONTENT_TYPE,
        headers={"Cache-Control": "public, max-age=3600"},
    )
