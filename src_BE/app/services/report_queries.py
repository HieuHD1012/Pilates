"""Truy vấn báo cáo — **một nguồn cho cả màn hình lẫn file xuất**.

Nguyên tắc xuyên suốt: mỗi con số trên bảng tổng hợp phải mở ra được danh sách
các dòng tạo nên nó. Con số không đối chiếu được thì không có chỗ trên màn
hình, nên mỗi hàm tổng hợp ở đây đi kèm một hàm chi tiết dùng **đúng bộ lọc**.

Cũng vì thế `export.py` gọi lại đúng các hàm này thay vì viết truy vấn thứ hai:
hai truy vấn cho một con số là hai con số sẽ lệch nhau, và người phát hiện sẽ
là khách khi đối chiếu file xuất với màn hình.

Biên kỳ luôn tính theo giờ studio. Lấy theo giờ tiến trình thì một giao dịch
xác nhận lúc 06:00 ngày 1 rơi sang tháng trước — và báo cáo tháng nào cũng
thiếu vài giao dịch đầu tháng mà không ai biết vì sao.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.rules import (
    HELD_BOOKING_STATUSES,
    TIMEZONE,
    UNCONFIRMED_PAYMENT_ALERT_DAYS,
    BookingStatus,
    PaymentMethod,
    PaymentStatus,
    SessionStatus,
    now,
)
from app.models.money import Payment, StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import Booking, ClassSession


def period_bounds(period_start: date, period_end: date) -> tuple[datetime, datetime]:
    """Nửa khoảng `[đầu kỳ 00:00, sau cuối kỳ 00:00)` theo giờ studio.

    Đóng đầu, mở cuối: cách duy nhất để hai kỳ liền nhau không vừa chồng lấn
    vừa bỏ sót một giây cuối ngày.
    """
    start = datetime.combine(period_start, time.min, tzinfo=TIMEZONE)
    end = datetime.combine(period_end + timedelta(days=1), time.min, tzinfo=TIMEZONE)
    return start, end


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=TIMEZONE)
    end = (
        datetime(year + 1, 1, 1, tzinfo=TIMEZONE)
        if month == 12
        else datetime(year, month + 1, 1, tzinfo=TIMEZONE)
    )
    return start, end


# --- Doanh thu ---------------------------------------------------------------


@dataclass(frozen=True)
class RevenueByMethod:
    method: PaymentMethod
    total: Decimal
    payment_count: int


@dataclass(frozen=True)
class RevenueSummary:
    total: Decimal
    payment_count: int
    by_method: list[RevenueByMethod]


@dataclass(frozen=True)
class RevenueRow:
    payment_id: int
    confirmed_at: datetime
    student_name: str
    package_name: str
    amount: Decimal
    method: PaymentMethod


def _confirmed_in_period(period_start: datetime, period_end: datetime):
    """Điều kiện chung của mọi truy vấn doanh thu.

    Chỉ `CONFIRMED`: `PENDING` là tiền chưa về và `VOID` là tiền đã huỷ. Mốc là
    `confirmed_at`, không phải `recorded_at` — ghi nhận và xác nhận có thể cách
    nhau nhiều ngày, và doanh thu thuộc về lúc tiền thật sự vào.
    """
    return (
        Payment.status == PaymentStatus.CONFIRMED,
        Payment.confirmed_at.is_not(None),
        Payment.confirmed_at >= period_start,
        Payment.confirmed_at < period_end,
    )


def revenue_summary(db: Session, *, period_start: datetime, period_end: datetime) -> RevenueSummary:
    rows = db.execute(
        select(
            Payment.method,
            func.coalesce(func.sum(Payment.amount), 0),
            func.count(),
        )
        .where(*_confirmed_in_period(period_start, period_end))
        .group_by(Payment.method)
        .order_by(Payment.method)
    ).all()

    by_method = [
        RevenueByMethod(method=method, total=Decimal(total), payment_count=int(count))
        for method, total, count in rows
    ]
    return RevenueSummary(
        total=sum((item.total for item in by_method), Decimal("0.00")),
        payment_count=sum(item.payment_count for item in by_method),
        by_method=by_method,
    )


def revenue_detail(
    db: Session, *, period_start: datetime, period_end: datetime, limit: int = 1000
) -> list[RevenueRow]:
    """Các dòng đứng sau con số doanh thu. Cùng bộ lọc, không có ngoại lệ nào."""
    rows = db.execute(
        select(
            Payment.id,
            Payment.confirmed_at,
            Student.full_name,
            StudentPackage.name_snapshot,
            Payment.amount,
            Payment.method,
        )
        .join(StudentPackage, StudentPackage.id == Payment.student_package_id)
        .join(Student, Student.id == StudentPackage.student_id)
        .where(*_confirmed_in_period(period_start, period_end))
        .order_by(Payment.confirmed_at, Payment.id)
        .limit(limit)
    ).all()
    return [
        RevenueRow(
            payment_id=payment_id,
            confirmed_at=confirmed_at,
            student_name=student_name,
            package_name=package_name,
            amount=Decimal(amount),
            method=method,
        )
        for payment_id, confirmed_at, student_name, package_name, amount, method in rows
    ]


# --- Lớp và đăng ký ----------------------------------------------------------


@dataclass(frozen=True)
class ClassStats:
    scheduled_sessions: int
    cancelled_sessions: int
    total_bookings: int
    total_capacity: int

    @property
    def fill_rate(self) -> float | None:
        """Mức lấp đầy. `None` khi chưa có lớp nào — **không phải 0**.

        Không có lớp thì mức lấp đầy không tồn tại; hiển thị 0% là bịa ra một
        sự thật rằng lớp mở mà không ai đến.
        """
        if not self.total_capacity:
            return None
        return self.total_bookings / self.total_capacity


def class_stats(db: Session, *, period_start: datetime, period_end: datetime) -> ClassStats:
    """Số lớp, lượt đăng ký và mức lấp đầy trong kỳ.

    Lớp đã hủy **ra khỏi mẫu số**: giữ lại thì một tuần studio phải đóng cửa sẽ
    hiện thành một tuần ế khách.
    """
    scheduled, cancelled, capacity = db.execute(
        select(
            func.count().filter(ClassSession.status == SessionStatus.SCHEDULED),
            func.count().filter(ClassSession.status == SessionStatus.CANCELLED),
            func.coalesce(
                func.sum(ClassSession.capacity).filter(
                    ClassSession.status == SessionStatus.SCHEDULED
                ),
                0,
            ),
        ).where(
            ClassSession.starts_at >= period_start,
            ClassSession.starts_at < period_end,
        )
    ).one()

    bookings = db.scalar(
        select(func.count())
        .select_from(Booking)
        .join(ClassSession, ClassSession.id == Booking.class_session_id)
        .where(
            ClassSession.starts_at >= period_start,
            ClassSession.starts_at < period_end,
            ClassSession.status == SessionStatus.SCHEDULED,
            Booking.status.in_(HELD_BOOKING_STATUSES),
        )
    )
    return ClassStats(
        scheduled_sessions=int(scheduled),
        cancelled_sessions=int(cancelled),
        total_bookings=int(bookings or 0),
        total_capacity=int(capacity or 0),
    )


# --- Huấn luyện viên ---------------------------------------------------------


@dataclass(frozen=True)
class TrainerStats:
    trainer_id: int
    trainer_name: str
    scheduled_sessions: int
    cancelled_sessions: int
    total_bookings: int


def trainer_stats(
    db: Session,
    *,
    period_start: datetime,
    period_end: datetime,
    trainer_id: int | None = None,
) -> list[TrainerStats]:
    """Số lớp và lượt đăng ký theo HLV.

    Hàm này là **nguồn duy nhất** cho cả thống kê tháng ở chi tiết HLV lẫn báo
    cáo HLV. Hai màn hình cùng nói "số lớp của HLV này" mà tính bằng hai câu
    truy vấn khác nhau thì sớm muộn sẽ cho hai con số, và không ai biết con số
    nào đúng.
    """
    bookings = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.class_session_id == ClassSession.id,
            Booking.status.in_(HELD_BOOKING_STATUSES),
        )
        .correlate(ClassSession)
        .scalar_subquery()
    )
    stmt = (
        select(
            Trainer.id,
            Trainer.full_name,
            func.count(ClassSession.id).filter(ClassSession.status == SessionStatus.SCHEDULED),
            func.count(ClassSession.id).filter(ClassSession.status == SessionStatus.CANCELLED),
            func.coalesce(
                func.sum(bookings).filter(ClassSession.status == SessionStatus.SCHEDULED),
                0,
            ),
        )
        .select_from(Trainer)
        .outerjoin(
            ClassSession,
            (ClassSession.trainer_id == Trainer.id)
            & (ClassSession.starts_at >= period_start)
            & (ClassSession.starts_at < period_end),
        )
        .group_by(Trainer.id, Trainer.full_name)
        .order_by(Trainer.full_name, Trainer.id)
    )
    if trainer_id is not None:
        stmt = stmt.where(Trainer.id == trainer_id)

    return [
        TrainerStats(
            trainer_id=row[0],
            trainer_name=row[1],
            scheduled_sessions=int(row[2]),
            cancelled_sessions=int(row[3]),
            total_bookings=int(row[4] or 0),
        )
        for row in db.execute(stmt).all()
    ]


#: Các mức sĩ số hiển thị thành cột trên bảng phân bố lớp theo sĩ số.
#: Lớp không có ai giữ ghế không thuộc mức nào — xem `trainer_class_sizes`.
CLASS_SIZE_BUCKETS = (1, 2, 3, 4, 5)


@dataclass(frozen=True)
class TrainerClassSizes:
    trainer_id: int
    trainer_name: str
    #: Khoá là sĩ số, giá trị là số lớp. Luôn đủ mọi mức trong
    #: `CLASS_SIZE_BUCKETS`, kể cả mức bằng 0.
    sessions_by_size: dict[int, int]
    #: Lớp đông hơn mức lớn nhất. Sức chứa không bị chặn trần ở tầng dữ liệu,
    #: nên gộp chúng vào đây thay vì bỏ đi: một lớp biến mất khỏi bảng là một
    #: buổi dạy không ai thấy.
    sessions_over_max: int
    #: Lớp đã xếp lịch nhưng không ai giữ ghế — trên thực tế lớp không diễn ra.
    #: Khác với lớp bị huỷ tường minh (`SessionStatus.CANCELLED`), là một hành
    #: động có người thực hiện và có lý do; hai thứ này không gộp được.
    sessions_empty: int
    #: Tổng mọi cột trên cùng một dòng. Bằng đúng `scheduled_sessions` của
    #: `trainer_stats` trong cùng kỳ — mỗi lớp còn hiệu lực rơi vào đúng một cột.
    total_sessions: int


def trainer_class_sizes(
    db: Session,
    *,
    period_start: datetime,
    period_end: datetime,
    trainer_id: int | None = None,
) -> list[TrainerClassSizes]:
    """Phân bố số lớp theo sĩ số của từng HLV.

    Sĩ số đếm theo **ghế đã giữ** — cùng `HELD_BOOKING_STATUSES` mà
    `trainer_stats` dùng. Người đặt chỗ rồi không đến vẫn chiếm một ghế và HLV
    vẫn dạy đủ buổi, nên đếm theo người có mặt sẽ cho một con số khác hẳn và
    hai báo cáo sẽ đá nhau.

    Chỉ tính lớp còn hiệu lực: lớp đã huỷ không phải buổi dạy, và số lớp huỷ
    đã có sẵn ở `trainer_stats`. Lớp không ai giữ ghế vào cột `sessions_empty`
    thay vì bị bỏ đi, nên mỗi lớp còn hiệu lực rơi vào đúng một cột và tổng
    dòng khớp `scheduled_sessions` — bảng nào không cộng lại được thì không ai
    dám dùng nó để trả công.
    """
    sizes = (
        select(
            ClassSession.trainer_id.label("trainer_id"),
            ClassSession.id.label("session_id"),
            func.count(Booking.id).label("size"),
        )
        .select_from(ClassSession)
        .outerjoin(
            Booking,
            (Booking.class_session_id == ClassSession.id)
            & (Booking.status.in_(HELD_BOOKING_STATUSES)),
        )
        .where(
            ClassSession.status == SessionStatus.SCHEDULED,
            ClassSession.starts_at >= period_start,
            ClassSession.starts_at < period_end,
        )
        .group_by(ClassSession.trainer_id, ClassSession.id)
        .subquery()
    )
    stmt = (
        select(
            Trainer.id,
            Trainer.full_name,
            sizes.c.size,
            func.count(sizes.c.session_id),
        )
        .select_from(Trainer)
        .outerjoin(sizes, sizes.c.trainer_id == Trainer.id)
        .group_by(Trainer.id, Trainer.full_name, sizes.c.size)
        .order_by(Trainer.full_name, Trainer.id)
    )
    if trainer_id is not None:
        stmt = stmt.where(Trainer.id == trainer_id)

    # HLV chưa dạy buổi nào vẫn phải có một dòng đủ cột số 0: biến mất khỏi
    # bảng là cách một HLV rảnh cả kỳ trở nên vô hình.
    names: dict[int, str] = {}
    counts: dict[int, dict[int, int]] = {}
    over_max: dict[int, int] = {}
    empty: dict[int, int] = {}
    for row_trainer_id, full_name, size, session_count in db.execute(stmt).all():
        names.setdefault(row_trainer_id, full_name)
        counts.setdefault(row_trainer_id, {bucket: 0 for bucket in CLASS_SIZE_BUCKETS})
        over_max.setdefault(row_trainer_id, 0)
        empty.setdefault(row_trainer_id, 0)
        # `size is None` là HLV không có buổi nào trong kỳ — khác hẳn `size == 0`
        # là một buổi có thật mà không ai đăng ký.
        if size is None or not session_count:
            continue
        if size == 0:
            empty[row_trainer_id] += int(session_count)
        elif size in counts[row_trainer_id]:
            counts[row_trainer_id][size] = int(session_count)
        else:
            over_max[row_trainer_id] += int(session_count)

    return [
        TrainerClassSizes(
            trainer_id=key,
            trainer_name=names[key],
            sessions_by_size=counts[key],
            sessions_over_max=over_max[key],
            sessions_empty=empty[key],
            total_sessions=(sum(counts[key].values()) + over_max[key] + empty[key]),
        )
        for key in names
    ]


# --- Việc cần xử lý ----------------------------------------------------------


@dataclass(frozen=True)
class UnconfirmedPayment:
    payment_id: int
    student_id: int
    student_name: str
    student_package_id: int
    package_name: str
    amount: Decimal
    recorded_at: datetime
    days_pending: int


def unconfirmed_payments(
    db: Session, *, older_than_days: int = UNCONFIRMED_PAYMENT_ALERT_DAYS
) -> list[UnconfirmedPayment]:
    """Gói đã cộng buổi mà tiền chưa xác nhận quá `older_than_days` ngày.

    Đây là chỗ **duy nhất** khoảng lệch giữa "đã cho tập" và "đã thu tiền" trở
    nên nhìn thấy được. Buổi được cộng ngay khi bán gói, không đợi xác nhận
    thanh toán; nếu không có danh sách này thì một khoản `PENDING` bị bỏ quên
    sẽ nằm im mãi mãi.
    """
    cutoff = now() - timedelta(days=older_than_days)
    rows = db.execute(
        select(
            Payment.id,
            Student.id,
            Student.full_name,
            StudentPackage.id,
            StudentPackage.name_snapshot,
            Payment.amount,
            Payment.recorded_at,
        )
        .join(StudentPackage, StudentPackage.id == Payment.student_package_id)
        .join(Student, Student.id == StudentPackage.student_id)
        .where(
            Payment.status == PaymentStatus.PENDING,
            Payment.recorded_at < cutoff,
        )
        .order_by(Payment.recorded_at, Payment.id)
    ).all()
    reference = now()
    return [
        UnconfirmedPayment(
            payment_id=row[0],
            student_id=row[1],
            student_name=row[2],
            student_package_id=row[3],
            package_name=row[4],
            amount=Decimal(row[5]),
            recorded_at=row[6],
            days_pending=(reference - row[6]).days,
        )
        for row in rows
    ]


@dataclass(frozen=True)
class SessionRow:
    class_session_id: int
    starts_at: datetime
    trainer_name: str
    capacity: int
    booked_count: int
    status: SessionStatus


def sessions_needing_attendance(db: Session, limit: int = 20) -> list[SessionRow]:
    pending = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.class_session_id == ClassSession.id,
            Booking.status == BookingStatus.BOOKED,
        )
        .correlate(ClassSession)
        .scalar_subquery()
    )
    rows = db.execute(
        select(
            ClassSession.id,
            ClassSession.starts_at,
            Trainer.full_name,
            ClassSession.capacity,
            pending,
            ClassSession.status,
        )
        .join(Trainer, Trainer.id == ClassSession.trainer_id)
        .where(
            ClassSession.status == SessionStatus.SCHEDULED,
            ClassSession.ends_at <= now(),
            pending > 0,
        )
        .order_by(ClassSession.ends_at, ClassSession.id)
        .limit(limit)
    ).all()
    return [SessionRow(*row) for row in rows]


def sessions_today(db: Session) -> list[SessionRow]:
    start = datetime.combine(now().date(), time.min, tzinfo=TIMEZONE)
    return _session_rows(db, start, start + timedelta(days=1))


def _session_rows(db: Session, period_start: datetime, period_end: datetime) -> list[SessionRow]:
    booked = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.class_session_id == ClassSession.id,
            Booking.status.in_(HELD_BOOKING_STATUSES),
        )
        .correlate(ClassSession)
        .scalar_subquery()
    )
    rows = db.execute(
        select(
            ClassSession.id,
            ClassSession.starts_at,
            Trainer.full_name,
            ClassSession.capacity,
            booked,
            ClassSession.status,
        )
        .join(Trainer, Trainer.id == ClassSession.trainer_id)
        .where(
            ClassSession.starts_at >= period_start,
            ClassSession.starts_at < period_end,
        )
        .order_by(ClassSession.starts_at, ClassSession.id)
    ).all()
    return [
        SessionRow(
            class_session_id=row[0],
            starts_at=row[1],
            trainer_name=row[2],
            capacity=row[3],
            booked_count=int(row[4] or 0),
            status=row[5],
        )
        for row in rows
    ]
