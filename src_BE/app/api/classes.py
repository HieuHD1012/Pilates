"""Lớp và lịch học (F06).

Gồm cả **lần chạy hai** của hai hạng mục F04 — thống kê tháng của HLV và
"Lịch dạy của tôi" — vì cả hai là hàm của `class_session` và chỉ tồn tại được
từ phase này trở đi.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.content_rules import sanitize_plain_text
from app.core.errors import ForbiddenError, NotFoundError
from app.core.permissions import (
    Actor,
    get_current_actor,
    require_staff,
    require_trainer,
    scope_class_sessions,
)
from app.db import get_db
from app.domain.rules import (
    HELD_BOOKING_STATUSES,
    ClassType,
    Role,
    SessionStatus,
    as_studio_time,
)
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession
from app.schemas.booking import AttendanceResponse, AttendanceRosterItem
from app.schemas.scheduling import (
    CancelSessionRequest,
    CancelSessionResponse,
    ChangeTrainerRequest,
    ClassSessionCreate,
    ClassSessionDetail,
    ClassSessionResponse,
    OccurrenceResponse,
    RecurrenceCreatedResponse,
    RecurrencePreviewResponse,
    RecurrenceRequest,
    TrainerMonthlyStats,
)
from app.services import recurrence as recurrence_service
from app.services import report_queries, scheduling

router = APIRouter(prefix="/classes", tags=["classes"])


def _get_session(db: Session, session_id: int) -> ClassSession:
    class_session = db.get(ClassSession, session_id)
    if class_session is None:
        raise NotFoundError("Không tìm thấy buổi lớp.")
    return class_session


@router.get("", response_model=list[ClassSessionResponse])
def list_sessions(
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    starts_from: datetime | None = None,
    starts_to: datetime | None = None,
    trainer_id: int | None = None,
    class_type: ClassType | None = None,
    status: SessionStatus | None = None,
    limit: int = Query(default=200, ge=1, le=500),
) -> list[ClassSession]:
    """Lịch lớp theo khoảng thời gian.

    `scope_class_sessions` ghim phạm vi **vào câu truy vấn**: HLV chỉ lấy được
    lớp mình dạy, học viên chỉ thấy lớp còn hiệu lực. Lọc sau khi lấy là cách
    lịch của HLV này rò sang HLV khác.
    """
    stmt = select(ClassSession).order_by(ClassSession.starts_at, ClassSession.id)
    stmt = scope_class_sessions(stmt, actor)

    # Mốc naive từ query string nghĩa là giờ studio. Thiếu phép quy đổi này,
    # `?starts_from=2026-09-01` lệch 7 giờ và buổi lớp 06:00 rơi ra ngoài đúng
    # khoảng người dùng vừa chọn.
    starts_from = as_studio_time(starts_from)
    starts_to = as_studio_time(starts_to)

    if starts_from is not None:
        stmt = stmt.where(ClassSession.starts_at >= starts_from)
    if starts_to is not None:
        stmt = stmt.where(ClassSession.starts_at < starts_to)
    if trainer_id is not None:
        stmt = stmt.where(ClassSession.trainer_id == trainer_id)
    if class_type is not None:
        stmt = stmt.where(ClassSession.class_type == class_type)
    if status is not None:
        stmt = stmt.where(ClassSession.status == status)

    return list(db.scalars(stmt.limit(limit)))


@router.get("/my-schedule", response_model=list[ClassSessionResponse])
def my_schedule(
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    starts_from: datetime | None = None,
    starts_to: datetime | None = None,
) -> list[ClassSession]:
    """Lịch dạy của HLV đang đăng nhập (F04, khép lại ở cửa sổ F06).

    Lọc theo `trainer_id` của chính người đăng nhập, ghim ở tầng truy vấn —
    không nhận `trainer_id` từ tham số, nên không có gì để giả mạo.
    """
    if actor.role is not Role.TRAINER or actor.trainer_id is None:
        raise ForbiddenError("Chỉ huấn luyện viên mới có lịch dạy.")

    stmt = (
        select(ClassSession)
        .where(
            ClassSession.trainer_id == actor.trainer_id,
            ClassSession.status == SessionStatus.SCHEDULED,
        )
        .order_by(ClassSession.starts_at)
    )
    starts_from = as_studio_time(starts_from)
    starts_to = as_studio_time(starts_to)
    if starts_from is not None:
        stmt = stmt.where(ClassSession.starts_at >= starts_from)
    if starts_to is not None:
        stmt = stmt.where(ClassSession.starts_at < starts_to)
    return list(db.scalars(stmt))


@router.get("/trainer-stats", response_model=TrainerMonthlyStats)
def trainer_monthly_stats(
    trainer_id: int,
    year: int = Query(ge=2020, le=2100),
    month: int = Query(ge=1, le=12),
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> TrainerMonthlyStats:
    """Số lớp của một HLV trong tháng.

    Tính bằng **đúng hàm** mà báo cáo HLV dùng. Hai màn hình cùng nói "số lớp
    của HLV này" mà chạy hai câu truy vấn khác nhau thì sớm muộn sẽ cho hai con
    số, và không ai biết con số nào đúng. Biên tháng theo giờ studio; lấy theo
    giờ container thì buổi 06:00 ngày 1 rơi sang tháng trước.
    """
    period_start, period_end = report_queries.month_bounds(year, month)
    rows = report_queries.trainer_stats(
        db, period_start=period_start, period_end=period_end, trainer_id=trainer_id
    )
    if not rows:
        raise NotFoundError("Không tìm thấy huấn luyện viên.")
    stats = rows[0]
    return TrainerMonthlyStats(
        trainer_id=stats.trainer_id,
        year=year,
        month=month,
        scheduled_sessions=stats.scheduled_sessions,
        cancelled_sessions=stats.cancelled_sessions,
        total_bookings=stats.total_bookings,
    )


@router.get("/{session_id}", response_model=ClassSessionDetail)
def get_session_detail(
    session_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> ClassSessionDetail:
    """Chi tiết một buổi lớp.

    `booked_count` và `seats_left` **chỉ trả cho nhân viên**; học viên nhận bản
    rút gọn.
    """
    class_session = _get_session(db, session_id)
    if actor.role is Role.TRAINER and class_session.trainer_id != actor.trainer_id:
        raise ForbiddenError("Bạn chỉ xem được lớp mình dạy.")
    if actor.role is Role.STUDENT and class_session.status is SessionStatus.CANCELLED:
        # `scope_class_sessions` đã giấu lớp đã hủy khỏi danh sách của học viên;
        # đường theo id không được là cửa sau vào đúng dữ liệu đó.
        raise NotFoundError("Không tìm thấy buổi lớp.")

    booked = scheduling.booked_count(db, session_id)
    trainer_name = db.scalar(
        select(Trainer.full_name).where(Trainer.id == class_session.trainer_id)
    )
    detail = ClassSessionDetail(
        **ClassSessionResponse.model_validate(class_session).model_dump(),
        booked_count=booked,
        seats_left=max(class_session.capacity - booked, 0),
        trainer_name=trainer_name or "",
    )
    if actor.role is Role.STUDENT:
        # Số chỗ còn lại là dữ liệu vận hành. Học viên chỉ cần biết lớp còn chỗ
        # hay không — "lớp 6h sáng thứ Ba chỉ có 1 người" là thứ trang công khai
        # đã cố ý không nói, và đường đăng nhập không nên nói thay.
        detail.booked_count = 0
        detail.seats_left = 1 if booked < class_session.capacity else 0
        detail.cancel_reason = None
    return detail


@router.get("/{session_id}/attendance", response_model=list[AttendanceRosterItem])
def attendance_roster(
    session_id: int,
    actor: Actor = Depends(require_trainer),
    db: Session = Depends(get_db),
) -> list[AttendanceRosterItem]:
    """Danh sách điểm danh của lớp HLV đang dạy, không trả tiền hay thông tin gói.

    Đọc được trước giờ kết thúc để chuẩn bị; cập nhật chỉ được sau ends_at.
    Lượt đã hủy không xuất hiện trong danh sách.
    """
    class_session = _get_session(db, session_id)
    if actor.trainer_id is None or class_session.trainer_id != actor.trainer_id:
        raise ForbiddenError("Bạn chỉ xem điểm danh lớp mình dạy.")
    rows = db.execute(
        select(Booking, Student.full_name)
        .join(Student, Student.id == Booking.student_id)
        .where(
            Booking.class_session_id == session_id,
            Booking.status.in_(HELD_BOOKING_STATUSES),
        )
        .order_by(Student.full_name, Booking.id)
    ).all()
    return [
        AttendanceRosterItem(
            **AttendanceResponse.model_validate(booking).model_dump(),
            student_name=name,
        )
        for booking, name in rows
    ]


@router.post("", response_model=ClassSessionResponse, status_code=201)
def create_session(
    payload: ClassSessionCreate,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> ClassSession:
    """Tạo một buổi lớp. Từ chối nếu HLV đã có lớp trùng giờ."""
    return scheduling.create_session(
        db,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        trainer_id=payload.trainer_id,
        class_type=payload.class_type,
        capacity=payload.capacity,
        actor_user_id=actor.id,
    )


@router.post("/{session_id}/trainer", response_model=ClassSessionResponse)
def change_trainer(
    session_id: int,
    payload: ChangeTrainerRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> ClassSession:
    """Đổi HLV của một buổi lớp. Từ chối nếu HLV mới trùng giờ dạy."""
    return scheduling.change_trainer(
        db, session_id=session_id, trainer_id=payload.trainer_id, actor_user_id=actor.id
    )


@router.post("/{session_id}/cancel", response_model=CancelSessionResponse)
def cancel_session(
    session_id: int,
    payload: CancelSessionRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> CancelSessionResponse:
    """Studio hủy lớp và hoàn buổi cho mọi người đã đăng ký, bất kể thời điểm."""
    outcome = scheduling.cancel_session(
        db,
        session_id=session_id,
        actor_user_id=actor.id,
        reason=sanitize_plain_text(payload.reason, 500, "reason") or "",
    )
    return CancelSessionResponse(
        session_id=outcome.session_id,
        refunded_booking_ids=outcome.refunded_booking_ids,
        cancelled_waitlist_ids=outcome.cancelled_waitlist_ids,
    )


# --- Lịch lặp lại ------------------------------------------------------------


@router.post("/recurrence/preview", response_model=RecurrencePreviewResponse)
def preview_recurrence(
    payload: RecurrenceRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> RecurrencePreviewResponse:
    """Xem trước các buổi sẽ tạo, kèm buổi nào trùng giờ HLV."""
    preview = recurrence_service.build_preview(
        db,
        start_date=payload.start_date,
        end_date=payload.end_date,
        weekdays=set(payload.weekdays),
        start_time=payload.start_time,
        duration_minutes=payload.duration_minutes,
        trainer_id=payload.trainer_id,
    )
    return RecurrencePreviewResponse(
        occurrences=[
            OccurrenceResponse(
                starts_at=item.starts_at, ends_at=item.ends_at, conflict=item.conflict
            )
            for item in preview.occurrences
        ],
        available_count=len(preview.available),
        conflict_count=len(preview.conflicts),
    )


@router.post("/recurrence", response_model=RecurrenceCreatedResponse, status_code=201)
def create_recurrence(
    payload: RecurrenceRequest,
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> RecurrenceCreatedResponse:
    """Tạo cả nhóm buổi — **all-or-nothing**.

    Buổi trùng giờ bị bỏ qua ngay từ bản xem trước; nếu ai đó chiếm khung giờ
    trong lúc nhân viên đang xem thì cả nhóm rollback và trả 409, chứ không để
    lại một nhóm ghi dở.
    """
    preview = recurrence_service.build_preview(
        db,
        start_date=payload.start_date,
        end_date=payload.end_date,
        weekdays=set(payload.weekdays),
        start_time=payload.start_time,
        duration_minutes=payload.duration_minutes,
        trainer_id=payload.trainer_id,
    )
    recurrence_id, sessions = recurrence_service.create_recurring_sessions(
        db,
        occurrences=preview.occurrences,
        trainer_id=payload.trainer_id,
        class_type=payload.class_type,
        capacity=payload.capacity,
        actor_user_id=actor.id,
    )
    return RecurrenceCreatedResponse(
        recurrence_id=recurrence_id,
        sessions=[ClassSessionResponse.model_validate(item) for item in sessions],
    )
