"""Nhắc học viên sắp hết gói.

**Không gửi tin nhắn nào.** Các endpoint ở đây lập danh sách người cần gọi và
ghi lại kết quả cuộc gọi; việc gọi là của nhân viên. Giao diện có thể mở Zalo
bằng deep link, nhưng nội dung do người gõ.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.content_rules import sanitize_plain_text
from app.core.permissions import Actor, assert_can_read_student, require_staff
from app.db import get_db
from app.models.people import RenewalContact
from app.schemas.renewal import (
    RenewalCandidateResponse,
    RenewalContactCreate,
    RenewalContactResponse,
    RenewalSummaryResponse,
)
from app.services import renewal_query

router = APIRouter(prefix="/renewals", tags=["renewals"])


@router.get("/summary", response_model=RenewalSummaryResponse)
def summary(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> RenewalSummaryResponse:
    """Bảng tổng hợp nhắc gia hạn — **chỉ đếm người, không có số liệu kinh doanh**.

    Màn này mở suốt ngày ở quầy lễ tân nơi khách nhìn được màn hình.
    """
    result = renewal_query.summary(db)
    return RenewalSummaryResponse(
        needing_contact=result.needing_contact,
        low_credits=result.low_credits,
        expiring_soon=result.expiring_soon,
        never_contacted=result.never_contacted,
    )


@router.get("", response_model=list[RenewalCandidateResponse])
def list_candidates(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    max_credits: int | None = Query(default=None, ge=0),
    max_days: int | None = Query(default=None, ge=0),
    contacted: bool | None = None,
    limit: int = Query(default=200, ge=1, le=500),
) -> list[RenewalCandidateResponse]:
    """Danh sách học viên cần liên hệ.

    Bộ lọc chỉ **thu hẹp** danh sách quanh ngưỡng mặc định (≤6 buổi hoặc ≤15
    ngày); không có tham số nào nới rộng nó, để hai người mở cùng màn hình
    không thấy hai định nghĩa "cần liên hệ" khác nhau.
    """
    return [
        RenewalCandidateResponse(
            student_id=item.student_id,
            student_name=item.student_name,
            student_phone=item.student_phone,
            student_package_id=item.student_package_id,
            package_name=item.package_name,
            credits_remaining=item.credits_remaining,
            end_date=item.end_date,
            days_remaining=item.days_remaining,
            reasons=list(item.reasons),
            last_contacted_at=item.last_contacted_at,
            last_contact_result=item.last_contact_result,
            next_contact_date=item.next_contact_date,
        )
        for item in renewal_query.candidates(
            db,
            max_credits=max_credits,
            max_days=max_days,
            contacted=contacted,
            limit=limit,
        )
    ]


@router.post("/contacts", response_model=RenewalContactResponse, status_code=201)
def create_contact(
    payload: RenewalContactCreate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> RenewalContact:
    """Ghi kết quả một lần liên hệ. Lịch sử là append — không sửa dòng cũ."""
    return renewal_query.record_contact(
        db,
        student_id=payload.student_id,
        # Làm sạch thẻ nhưng **không** áp luật nội dung công khai: đây là ghi
        # chú nội bộ của nhân viên, không lên trang nào cả. Áp luật P3 ở đây sẽ
        # chặn những câu hoàn toàn hợp lệ như trích dẫn lời khách.
        result=sanitize_plain_text(payload.result, 1000, "result"),
        next_contact_date=payload.next_contact_date,
        actor_user_id=actor.id,
    )


@router.get("/students/{student_id}/contacts", response_model=list[RenewalContactResponse])
def contact_history(
    student_id: int,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[RenewalContact]:
    """Lịch sử liên hệ gia hạn của một học viên, mới nhất trước."""
    assert_can_read_student(actor, student_id)
    return renewal_query.contact_history(db, student_id, limit=limit)
