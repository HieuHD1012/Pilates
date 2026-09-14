"""Báo cáo.

Mọi con số ở đây đi kèm đường dẫn tới danh sách chi tiết đứng sau nó, và file
xuất chạy **đúng truy vấn của màn hình**. Hai quy tắc đó là cùng một quy tắc:
một con số không mở ra được các dòng tạo nên nó thì không kiểm chứng được, và
không kiểm chứng được thì không nên tin.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.permissions import Actor, require_staff
from app.db import get_db
from app.domain.rules import TIMEZONE, UNCONFIRMED_PAYMENT_ALERT_DAYS, now, today
from app.schemas.report import (
    ClassStatsResponse,
    DashboardNumber,
    DashboardResponse,
    RevenueByMethodResponse,
    RevenueRowResponse,
    RevenueSummaryResponse,
    SessionRowResponse,
    TrainerClassSizeResponse,
    TrainerStatsResponse,
    UnconfirmedPaymentResponse,
)
from app.services import export, renewal_query, report_queries

router = APIRouter(prefix="/reports", tags=["reports"])

#: Kỳ mặc định khi màn hình chưa chọn: 30 ngày gần nhất tính theo giờ studio.
DEFAULT_PERIOD_DAYS = 30


def _period(period_start: date | None, period_end: date | None) -> tuple[date, date]:
    end = period_end or today()
    start = period_start or end - timedelta(days=DEFAULT_PERIOD_DAYS - 1)
    return start, end


def _range_query(bounds: tuple[datetime, datetime]) -> str:
    """Khoảng thời gian dưới dạng tham số của danh sách chi tiết.

    Viết ra **không kèm múi giờ** một cách có chủ ý: mọi endpoint nhận mốc thời
    gian đều hiểu giá trị naive là giờ studio, nên chuỗi này đi vòng về đúng
    khoảng nửa mở mà con số đã dùng. Truyền `period_end` dạng ngày như trước sẽ
    mất **trọn ngày cuối kỳ**, vì `/classes` lọc `starts_at < starts_to`.
    """
    fmt = "%Y-%m-%dT%H:%M:%S"
    return f"starts_from={bounds[0].strftime(fmt)}&starts_to={bounds[1].strftime(fmt)}"


def _session_rows(rows) -> list[SessionRowResponse]:
    return [
        SessionRowResponse(
            class_session_id=row.class_session_id,
            starts_at=row.starts_at,
            trainer_name=row.trainer_name,
            capacity=row.capacity,
            booked_count=row.booked_count,
            status=row.status,
        )
        for row in rows
    ]


@router.get("/revenue", response_model=RevenueSummaryResponse)
def revenue(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
) -> RevenueSummaryResponse:
    """Doanh thu của một kỳ.

    Chỉ gồm giao dịch `CONFIRMED` và tính theo `confirmed_at`. Kèm `detail_path`
    mở ra đúng các dòng tạo nên con số — dùng thẳng chuỗi đó, đừng tự ghép.
    """
    start, end = _period(period_start, period_end)
    bounds = report_queries.period_bounds(start, end)
    summary = report_queries.revenue_summary(db, period_start=bounds[0], period_end=bounds[1])
    return RevenueSummaryResponse(
        period_start=start,
        period_end=end,
        total=summary.total,
        payment_count=summary.payment_count,
        by_method=[
            RevenueByMethodResponse(
                method=item.method, total=item.total, payment_count=item.payment_count
            )
            for item in summary.by_method
        ],
        detail_path=f"/reports/revenue/detail?period_start={start}&period_end={end}",
    )


@router.get("/revenue/detail", response_model=list[RevenueRowResponse])
def revenue_detail(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
    limit: int = Query(default=500, ge=1, le=1000),
) -> list[RevenueRowResponse]:
    """Các dòng đứng sau con số doanh thu — cùng bộ lọc, cùng truy vấn."""
    start, end = _period(period_start, period_end)
    bounds = report_queries.period_bounds(start, end)
    return [
        RevenueRowResponse(
            payment_id=row.payment_id,
            confirmed_at=row.confirmed_at,
            student_name=row.student_name,
            package_name=row.package_name,
            amount=row.amount,
            method=row.method,
        )
        for row in report_queries.revenue_detail(
            db, period_start=bounds[0], period_end=bounds[1], limit=limit
        )
    ]


@router.get("/classes", response_model=ClassStatsResponse)
def classes(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
) -> ClassStatsResponse:
    """Thống kê lớp và tỉ lệ lấp đầy của một kỳ.

    `fill_rate` là `null` khi kỳ không có lớp nào — để trống ô đó, đừng hiện 0%.
    """
    start, end = _period(period_start, period_end)
    bounds = report_queries.period_bounds(start, end)
    stats = report_queries.class_stats(db, period_start=bounds[0], period_end=bounds[1])
    return ClassStatsResponse(
        period_start=start,
        period_end=end,
        scheduled_sessions=stats.scheduled_sessions,
        cancelled_sessions=stats.cancelled_sessions,
        total_bookings=stats.total_bookings,
        total_capacity=stats.total_capacity,
        fill_rate=stats.fill_rate,
        detail_path=f"/classes?{_range_query(bounds)}",
    )


def _trainer_rows(
    db: Session, period_start: date | None, period_end: date | None
) -> tuple[date, date, list[report_queries.TrainerStats]]:
    start, end = _period(period_start, period_end)
    bounds = report_queries.period_bounds(start, end)
    return (
        start,
        end,
        report_queries.trainer_stats(db, period_start=bounds[0], period_end=bounds[1]),
    )


@router.get("/trainers", response_model=list[TrainerStatsResponse])
def trainers(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[TrainerStatsResponse]:
    """Số buổi dạy và số lượt học của từng HLV trong kỳ."""
    _, _, rows = _trainer_rows(db, period_start, period_end)
    return [
        TrainerStatsResponse(
            trainer_id=row.trainer_id,
            trainer_name=row.trainer_name,
            scheduled_sessions=row.scheduled_sessions,
            cancelled_sessions=row.cancelled_sessions,
            total_bookings=row.total_bookings,
        )
        for row in rows
    ]


#: Cột của bảng phân bố, dùng chung cho màn hình và file xuất.
CLASS_SIZE_HEADERS = [
    "Huấn luyện viên",
    "1 người",
    "2 người",
    "3 người",
    "4 người",
    "5 người",
    "Trên 5 người",
    "Không có học viên",
    "Tổng lớp",
]


def _class_size_rows(
    db: Session, period_start: date | None, period_end: date | None
) -> tuple[date, date, list[report_queries.TrainerClassSizes]]:
    start, end = _period(period_start, period_end)
    bounds = report_queries.period_bounds(start, end)
    return (
        start,
        end,
        report_queries.trainer_class_sizes(db, period_start=bounds[0], period_end=bounds[1]),
    )


@router.get("/trainers/class-sizes", response_model=list[TrainerClassSizeResponse])
def trainer_class_sizes(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[TrainerClassSizeResponse]:
    """Số lớp theo sĩ số của từng HLV trong kỳ.

    Bảng này trả lời "HLV dạy bao nhiêu lớp mỗi cỡ", còn `/reports/trainers`
    trả lời "HLV dạy bao nhiêu lớp và bao nhiêu lượt học".

    Sĩ số đếm theo ghế đã giữ, **cùng bộ trạng thái** mà báo cáo HLV dùng, nên
    tổng dòng ở đây bằng đúng `scheduled_sessions` bên đó. Lớp không ai đăng ký
    nằm ở cột riêng: nó vẫn là một buổi đã xếp lịch, chỉ là không diễn ra.
    """
    _, _, rows = _class_size_rows(db, period_start, period_end)
    return [
        TrainerClassSizeResponse(
            trainer_id=row.trainer_id,
            trainer_name=row.trainer_name,
            size_1=row.sessions_by_size[1],
            size_2=row.sessions_by_size[2],
            size_3=row.sessions_by_size[3],
            size_4=row.sessions_by_size[4],
            size_5=row.sessions_by_size[5],
            sessions_over_max=row.sessions_over_max,
            sessions_empty=row.sessions_empty,
            total_sessions=row.total_sessions,
        )
        for row in rows
    ]


@router.get("/trainers/class-sizes/export")
def export_trainer_class_sizes(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
    file_format: str = Query(default="csv", pattern="^(csv|xlsx)$", alias="format"),
) -> Response:
    """File xuất **từ chính truy vấn của màn hình**, cùng bộ lọc."""
    start, end, rows = _class_size_rows(db, period_start, period_end)
    table = [
        [
            row.trainer_name,
            *(row.sessions_by_size[bucket] for bucket in report_queries.CLASS_SIZE_BUCKETS),
            row.sessions_over_max,
            row.sessions_empty,
            row.total_sessions,
        ]
        for row in rows
    ]
    stem = f"so-lop-theo-si-so-{start}-den-{end}"

    if file_format == "xlsx":
        return Response(
            content=export.to_xlsx(CLASS_SIZE_HEADERS, table, sheet_title="So lop theo si so"),
            media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            headers={"Content-Disposition": f'attachment; filename="{stem}.xlsx"'},
        )
    return Response(
        content=export.to_csv(CLASS_SIZE_HEADERS, table),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{stem}.csv"'},
    )


@router.get("/trainers/export")
def export_trainers(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    period_start: date | None = None,
    period_end: date | None = None,
    file_format: str = Query(default="csv", pattern="^(csv|xlsx)$", alias="format"),
) -> Response:
    """File xuất **từ chính truy vấn của màn hình**, cùng bộ lọc.

    Tên HLV là văn bản do nhân viên nhập, nên vẫn đi qua bước trung hoà công
    thức như mọi ô khác.
    """
    start, end, rows = _trainer_rows(db, period_start, period_end)
    headers = ["Huấn luyện viên", "Số lớp", "Lớp đã hủy", "Lượt đăng ký"]
    table = [
        [row.trainer_name, row.scheduled_sessions, row.cancelled_sessions, row.total_bookings]
        for row in rows
    ]
    stem = f"bao-cao-hlv-{start}-den-{end}"

    if file_format == "xlsx":
        return Response(
            content=export.to_xlsx(headers, table, sheet_title="Bao cao HLV"),
            media_type=("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            headers={"Content-Disposition": f'attachment; filename="{stem}.xlsx"'},
        )
    return Response(
        content=export.to_csv(headers, table),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{stem}.csv"'},
    )


@router.get("/unconfirmed-payments", response_model=list[UnconfirmedPaymentResponse])
def unconfirmed_payments(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
    older_than_days: int = Query(default=UNCONFIRMED_PAYMENT_ALERT_DAYS, ge=0, le=365),
) -> list[UnconfirmedPaymentResponse]:
    """Gói đã cộng buổi mà tiền chưa xác nhận quá hạn."""
    return [
        UnconfirmedPaymentResponse(
            payment_id=row.payment_id,
            student_id=row.student_id,
            student_name=row.student_name,
            student_package_id=row.student_package_id,
            package_name=row.package_name,
            amount=row.amount,
            recorded_at=row.recorded_at,
            days_pending=row.days_pending,
        )
        for row in report_queries.unconfirmed_payments(db, older_than_days=older_than_days)
    ]


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    actor: Actor = Depends(require_staff),
    db: Session = Depends(get_db),
) -> DashboardResponse:
    """Bốn con số, lịch hôm nay và các lớp đã kết thúc còn chờ HLV điểm danh.

    Cố ý **không có ô doanh thu**: bảng này mở suốt ngày ở quầy lễ tân, nơi
    khách đứng nhìn được màn hình. Doanh thu có màn riêng, sau một lần đăng
    nhập và một lần bấm.
    """
    today_rows = report_queries.sessions_today(db)
    attention = report_queries.sessions_needing_attendance(db, limit=20)
    pending_payments = report_queries.unconfirmed_payments(db)
    renewals = renewal_query.summary(db)

    # Cùng khoảng mà `sessions_today` đã đếm. Trỏ tới `/classes` trần thì đường
    # dẫn trả về **toàn bộ** bảng chứ không phải các dòng tạo nên con số, và
    # tiêu chí "mọi con số mở ra được danh sách khớp với nó" không còn nghĩa.
    today_start = datetime.combine(now().date(), time.min, tzinfo=TIMEZONE)
    today_range = _range_query((today_start, today_start + timedelta(days=1)))

    numbers = [
        DashboardNumber(
            key="sessions_today",
            label="Lớp hôm nay",
            value=len(today_rows),
            detail_path=f"/classes?{today_range}",
        ),
        DashboardNumber(
            key="bookings_today",
            # Số **ghế đã đặt của các lớp diễn ra hôm nay**, không phải số lượt
            # bấm đặt trong ngày hôm nay — hai đại lượng khác nhau, và nhãn sai
            # ở đây là cách một con số đúng bị đọc thành một con số khác.
            label="Lượt đăng ký lớp hôm nay",
            value=sum(row.booked_count for row in today_rows),
            detail_path=f"/bookings?held_only=true&{today_range}",
        ),
        DashboardNumber(
            key="renewals_needing_contact",
            label="Học viên cần liên hệ gia hạn",
            value=renewals.needing_contact,
            detail_path="/renewals",
        ),
        DashboardNumber(
            key="unconfirmed_payments",
            label="Thanh toán chưa xác nhận quá hạn",
            value=len(pending_payments),
            detail_path="/reports/unconfirmed-payments",
        ),
    ]

    return DashboardResponse(
        numbers=numbers,
        sessions_needing_attention=_session_rows(attention),
        sessions_today=_session_rows(today_rows),
    )
