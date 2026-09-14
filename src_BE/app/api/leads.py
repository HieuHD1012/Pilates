"""Form tư vấn công khai và màn quản lý khách quan tâm."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.content_rules import sanitize_plain_text
from app.core.errors import NotFoundError, ValidationError
from app.core.permissions import Actor, require_staff
from app.core.rate_limit import client_ip, lead_limiter
from app.db import get_db
from app.domain.rules import LeadStatus, Role, normalize_phone, now
from app.models.people import Lead, Student
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.people import LeadCreate, LeadResponse, LeadUpdate, StudentResponse
from app.services.lead_conversion import convert_lead_to_student

public_router = APIRouter(prefix="/public", tags=["public"])
router = APIRouter(prefix="/leads", tags=["leads"], dependencies=[Depends(require_staff)])


@public_router.post("/leads", response_model=MessageResponse, status_code=201)
def submit_lead(
    payload: LeadCreate, request: Request, db: Session = Depends(get_db)
) -> MessageResponse:
    """Nhận form tư vấn từ khách ẩn danh.

    Ba lớp bảo vệ, vì đây là điểm duy nhất người lạ ghi được vào CSDL:

    - **Rate limit theo IP** — không có thì form là công cụ bơm rác.
    - **Chặn gửi trùng** cùng số điện thoại trong một cửa sổ ngắn, để một cú
      double-click không thành hai khách quan tâm.
    - **Sanitize mọi trường.** `need` là văn bản tự do do người lạ nhập và sẽ
      được nhân viên mở ra đọc — đây là đường XSS lưu trữ ngắn nhất của hệ.

    Luôn trả cùng một thông điệp, kể cả khi bị chặn vì trùng: khách không cần
    biết số của họ đã có trong hệ thống hay chưa, và ta cũng không nên nói.
    """
    settings = get_settings()
    ip_key = f"lead-ip:{client_ip(request)}"
    lead_limiter.assert_allowed(ip_key, "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau.")
    lead_limiter.register(ip_key)

    # So trên dạng đã chuẩn hoá: `0900 000 055` và `0900000055` là cùng một
    # người, và không chuẩn hoá thì một dấu cách đủ để vòng qua phép chặn trùng.
    phone = normalize_phone(payload.phone)
    window_start = now() - timedelta(minutes=settings.lead_duplicate_window_minutes)
    duplicate = db.scalar(
        select(Lead.id).where(Lead.phone == phone, Lead.created_at >= window_start)
    )
    # Người đã là học viên gửi lại form thì không tạo khách quan tâm mới —
    # nếu không, nhân viên nhận một "khách mới" trùng với một hồ sơ đang có.
    already_a_student = db.scalar(select(Student.id).where(Student.phone == phone))

    if duplicate is None and already_a_student is None:
        db.add(
            Lead(
                full_name=sanitize_plain_text(payload.full_name, 120, "full_name"),
                phone=phone,
                need=sanitize_plain_text(payload.need, 1000, "need"),
                source=sanitize_plain_text(payload.source, 64, "source"),
            )
        )

    return MessageResponse(
        message="Đã nhận thông tin. Studio sẽ liên hệ với bạn sớm."
    )


@router.get("", response_model=list[LeadResponse])
def list_leads(
    db: Session = Depends(get_db),
    status: LeadStatus | None = None,
    source: str | None = Query(default=None, max_length=64),
    q: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Lead]:
    """Danh sách khách quan tâm gửi từ form tư vấn trên trang công khai."""
    stmt = select(Lead).order_by(Lead.created_at.desc(), Lead.id.desc())
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    if source:
        stmt = stmt.where(Lead.source == source)
    if q:
        stmt = stmt.where(Lead.full_name.ilike(f"%{q}%") | Lead.phone.ilike(f"%{q}%"))
    return list(db.scalars(stmt.limit(limit).offset(offset)))


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db)) -> Lead:
    """Chi tiết một khách quan tâm."""
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise NotFoundError("Không tìm thấy khách quan tâm.")
    return lead


def _assert_assignable(db: Session, user_id: int | None) -> None:
    """`assigned_to` phải trỏ tới một nhân viên đang hoạt động.

    Gán thẳng giá trị người dùng gửi lên thì một id không tồn tại biến thành
    `ForeignKeyViolation` và đi ra ngoài dưới dạng 500, trong khi đây là đầu
    vào sai — đáng 422.
    """
    if user_id is None:
        return
    assignee = db.get(User, user_id)
    if assignee is None or not assignee.is_active:
        raise ValidationError(
            "Người được giao không tồn tại hoặc đã bị khoá.", code="INVALID_ASSIGNEE"
        )
    if assignee.role not in (Role.ADMIN, Role.STAFF):
        raise ValidationError(
            "Chỉ giao khách quan tâm cho quản trị viên hoặc nhân viên.",
            code="INVALID_ASSIGNEE",
        )


@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)
) -> Lead:
    """Cập nhật trạng thái theo dõi và ghi chú của một khách quan tâm."""
    lead = get_lead(lead_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "need" in data:
        data["need"] = sanitize_plain_text(data["need"], 1000, "need")
    if "assigned_to" in data:
        _assert_assignable(db, data["assigned_to"])
    for field, value in data.items():
        setattr(lead, field, value)
    return lead


@router.post("/{lead_id}/convert", response_model=StudentResponse, status_code=201)
def convert_lead(
    lead_id: int,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
):
    """Chuyển khách quan tâm thành học viên, không phải nhập lại gì."""
    return convert_lead_to_student(db, lead_id)
