"""Quản lý thông báo / khuyến mãi (nhân viên đăng, khách đọc)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.content_rules import clean_public_text
from app.core.errors import NotFoundError
from app.core.permissions import Actor, require_staff
from app.db import get_db
from app.domain.rules import now
from app.models.people import Announcement
from app.schemas.people import (
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementUpdate,
)

router = APIRouter(
    prefix="/announcements", tags=["announcements"], dependencies=[Depends(require_staff)]
)


def _get_or_404(db: Session, announcement_id: int) -> Announcement:
    announcement = db.get(Announcement, announcement_id)
    if announcement is None:
        raise NotFoundError("Không tìm thấy thông báo.")
    return announcement


@router.get("", response_model=list[AnnouncementResponse])
def list_announcements(
    db: Session = Depends(get_db),
    is_published: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Announcement]:
    """Danh sách thông báo, gồm cả bản chưa đăng."""
    stmt = select(Announcement).order_by(Announcement.id.desc())
    if is_published is not None:
        stmt = stmt.where(Announcement.is_published.is_(is_published))
    return list(db.scalars(stmt.limit(limit).offset(offset)))


@router.post("", response_model=AnnouncementResponse, status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Announcement:
    """Tạo thông báo.

    `title` và `body` đi qua validator quy tắc nội dung **khi ghi**. Đây là lớp
    duy nhất bắt được nội dung nhân viên nhập sau go-live — cổng CI chỉ chứng
    minh lập trình viên không gõ chuỗi cấm, nó mù hoàn toàn với dòng khuyến mãi
    lễ tân đăng vào tuần nghiệm thu.
    """
    announcement = Announcement(
        title=clean_public_text(
            payload.title, field="title", max_length=200, allow_empty=False
        ),
        body=clean_public_text(
            payload.body, field="body", max_length=10_000, rich=True, allow_empty=False
        ),
        is_published=payload.is_published,
        publish_at=payload.publish_at,
        created_by=actor.id,
    )
    db.add(announcement)
    db.flush()
    return announcement


@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> Announcement:
    """Sửa thông báo. Nội dung được lọc lại qua whitelist HTML."""
    announcement = _get_or_404(db, announcement_id)
    data = payload.model_dump(exclude_unset=True)

    if "title" in data:
        data["title"] = clean_public_text(
            data["title"], field="title", max_length=200, allow_empty=False
        )
    if "body" in data:
        data["body"] = clean_public_text(
            data["body"], field="body", max_length=10_000, rich=True, allow_empty=False
        )

    for field, value in data.items():
        setattr(announcement, field, value)
    announcement.updated_at = now()
    announcement.updated_by = actor.id
    return announcement


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(announcement_id: int, db: Session = Depends(get_db)) -> None:
    """Xoá hẳn một thông báo."""
    db.delete(_get_or_404(db, announcement_id))
