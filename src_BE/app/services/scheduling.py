"""Tạo, hủy buổi lớp và phân công HLV; không dời giờ.

Hai chỗ dễ sai:

1. **Trùng giờ HLV.** Kiểm ở tầng ứng dụng không đủ — hai yêu cầu đồng thời
   đều đọc "chưa có lớp nào" rồi cùng ghi. Ràng buộc `EXCLUDE` ở CSDL là lớp
   quyết định; ở đây chỉ dịch vi phạm thành 409 nghiệp vụ thay vì 500.
2. **Hủy lớp đua với đặt chỗ.** Xem `cancel_session`.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.domain.rules import (
    HELD_BOOKING_STATUSES,
    OPEN_WAITLIST_STATUSES,
    PRIVATE_DEFAULT_CAPACITY,
    BookingStatus,
    ClassType,
    LedgerReason,
    SessionStatus,
    WaitlistStatus,
    now,
)
from app.models.people import Trainer
from app.models.scheduling import Booking, ClassSession, WaitlistEntry
from app.services import credit_ledger

#: Lượt được hoàn buổi khi **studio hủy lớp**.
#:
#: Hẹp hơn `HELD_BOOKING_STATUSES` một cách có chủ ý, và đó là chỗ dễ nhầm nhất
#: trong tệp này: lượt đã điểm danh không có gì để hoàn (hủy lớp đã có điểm danh
#: bị chặn từ trước), còn lượt đã hủy thì đã được hoàn hoặc đã quá hạn — hoàn
#: thêm lần nữa là in tiền. Sĩ số và `SESSION_FULL` dùng tập rộng hơn.
REFUNDABLE_ON_CLASS_CANCEL = (BookingStatus.BOOKED,)

_TRAINER_OVERLAP_CONSTRAINT = "ex_class_session_trainer_no_overlap"


@dataclass(frozen=True)
class CancelOutcome:
    session_id: int
    refunded_booking_ids: list[int]
    cancelled_waitlist_ids: list[int]


def _get_session(db: Session, session_id: int, *, lock: bool = False) -> ClassSession:
    """Lấy buổi lớp. `lock=True` cho mọi đường **ghi**.

    Đọc trạng thái không khoá rồi mới ghi là một cửa sổ đua: `cancel_session`
    đang giữ `FOR UPDATE` thì câu UPDATE ở đây sẽ chờ, nhưng phép kiểm
    `SESSION_CANCELLED` đã chạy trên bản cũ và cho qua — kết quả là một lớp vừa
    bị hủy lại bị đổi giờ, để lại hai dòng audit mâu thuẫn nhau.
    """
    stmt = select(ClassSession).where(ClassSession.id == session_id)
    if lock:
        stmt = stmt.with_for_update()
    class_session = db.scalar(stmt)
    if class_session is None:
        raise NotFoundError("Không tìm thấy buổi lớp.")
    return class_session


def assert_trainer_bookable(db: Session, trainer_id: int) -> None:
    trainer = db.get(Trainer, trainer_id)
    if trainer is None:
        raise NotFoundError("Không tìm thấy huấn luyện viên.")
    if not trainer.is_active:
        raise BusinessError("TRAINER_INACTIVE", f"HLV '{trainer.full_name}' đã ngừng hoạt động.")


def translate_overlap(exc: IntegrityError) -> BusinessError:
    """Vi phạm chống trùng giờ là lỗi nghiệp vụ, không phải sự cố hệ thống."""
    if _TRAINER_OVERLAP_CONSTRAINT in str(exc.orig):
        return BusinessError(
            "TRAINER_DOUBLE_BOOKED",
            "Huấn luyện viên đã có lớp khác trùng khung giờ này.",
        )
    raise exc


def resolve_capacity(class_type: ClassType, capacity: int | None) -> int:
    """Sức chứa của một buổi lớp.

    `GROUP` do nhân viên đặt — **không hardcode con số nào**, đặc biệt không
    dùng 3 (con số của cơ sở khác, quy tắc nội dung cấm công bố).
    `PRIVATE` mặc định 1; Duo là Private sức chứa 2, nên vẫn cho đặt tay.
    """
    if class_type is ClassType.PRIVATE:
        resolved = capacity or PRIVATE_DEFAULT_CAPACITY
        if resolved not in (1, 2):
            raise BusinessError(
                "INVALID_PRIVATE_CAPACITY",
                "Lớp Private nhận 1 người, hoặc 2 nếu là lớp Duo.",
            )
        return resolved

    if not capacity or capacity < 1:
        raise BusinessError("CAPACITY_REQUIRED", "Lớp Group phải khai sức chứa khi tạo lớp.")
    return capacity


def create_session(
    db: Session,
    *,
    starts_at: datetime,
    ends_at: datetime,
    trainer_id: int,
    class_type: ClassType,
    capacity: int | None,
    actor_user_id: int,
    recurrence_id: str | None = None,
) -> ClassSession:
    if ends_at <= starts_at:
        raise BusinessError("INVALID_TIME_RANGE", "Giờ kết thúc phải sau giờ bắt đầu.")
    assert_trainer_bookable(db, trainer_id)

    class_session = ClassSession(
        starts_at=starts_at,
        ends_at=ends_at,
        trainer_id=trainer_id,
        class_type=class_type,
        capacity=resolve_capacity(class_type, capacity),
        created_by=actor_user_id,
        recurrence_id=recurrence_id,
    )
    db.add(class_session)
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError as exc:
        raise translate_overlap(exc) from exc
    return class_session


def booked_count(db: Session, session_id: int) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.class_session_id == session_id,
                Booking.status.in_(HELD_BOOKING_STATUSES),
            )
        )
        or 0
    )


def _assert_no_attendance(db: Session, session_id: int) -> None:
    marked = db.scalar(
        select(Booking.id)
        .where(
            Booking.class_session_id == session_id,
            Booking.status.in_((BookingStatus.ATTENDED, BookingStatus.NO_SHOW)),
        )
        .limit(1)
    )
    if marked is not None:
        raise BusinessError(
            "SESSION_HAS_ATTENDANCE", "Lớp đã có điểm danh, không được hủy, dời giờ hoặc đổi HLV."
        )


def change_trainer(
    db: Session, *, session_id: int, trainer_id: int, actor_user_id: int
) -> ClassSession:
    """Đổi HLV của một buổi lớp, giữ nguyên đăng ký.

    HLV mới trùng giờ thì bị ràng buộc `EXCLUDE` chặn — cùng một lớp bảo vệ
    với lúc tạo lớp, nên không có đường nào lách bằng cách sửa thay vì tạo.
    """
    class_session = _get_session(db, session_id, lock=True)
    if class_session.status is SessionStatus.CANCELLED:
        raise BusinessError("SESSION_CANCELLED", "Buổi lớp này đã bị hủy.")
    _assert_no_attendance(db, session_id)
    assert_trainer_bookable(db, trainer_id)

    class_session.trainer_id = trainer_id
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError as exc:
        raise translate_overlap(exc) from exc
    return class_session


def cancel_session(
    db: Session, *, session_id: int, actor_user_id: int, reason: str
) -> CancelOutcome:
    """Studio hủy một buổi lớp và hoàn buổi cho **mọi** người đã đăng ký.

    Trình tự dưới đây không phải tuỳ chọn — đọc kỹ trước khi sửa:

    1. **Đọc trước, không khoá**, để biết tập gói bị ảnh hưởng.
    2. **Khoá các gói đó theo `id` tăng dần.** Đây là đầu của thứ tự khoá toàn
       cục; làm ngược lại thì luồng hủy lớp và luồng đăng ký (F07) khoá chéo
       nhau và deadlock ở đúng luồng chạy nhiều nhất trong ngày.
    3. **Khoá buổi lớp và đặt trạng thái `CANCELLED` ngay.** Không khoá ở đây
       là lỗ hổng thật: nhân viên bấm hủy, 200ms sau học viên D đặt ghế cuối —
       transaction của D lấy khoá ngay vì transaction hủy không giữ nó, đọc
       `status` vẫn là `SCHEDULED` (chưa commit), đặt thành công và bị trừ 1
       buổi. Transaction hủy commit sau. D giữ một đăng ký trên lớp đã hủy,
       mất 1 buổi, **không có dòng hoàn nào** — vì lúc vòng lặp hoàn chạy thì
       D chưa tồn tại.
    4. **Đọc lại đăng ký dưới khoá.** Giữa bước 1 và 3 vẫn có người kịp chen
       vào; sau bước 3 thì không ai chen thêm được nữa, nên vòng hoàn ở đây là
       đầy đủ. Gói của người chen vào chưa nằm trong tập đã khoá ở bước 2 —
       `credit_ledger.record` tự lấy nốt khoá còn thiếu. Chấp nhận một lần lấy
       khoá ngoài thứ tự ở đúng nhánh hiếm này, đổi lại luồng đăng ký không bao
       giờ deadlock với hủy lớp.

    Lọc `status = 'BOOKED'` cũng bắt buộc: thiếu nó, một đăng ký đã hủy đúng
    hạn (đã hoàn một lần) sẽ được hoàn lần thứ hai.
    """
    if not reason.strip():
        raise BusinessError("CANCEL_NEEDS_REASON", "Hủy lớp bắt buộc phải có lý do.")

    # 1. Đọc trước, không khoá.
    package_ids = list(
        db.scalars(
            select(Booking.student_package_id).where(
                Booking.class_session_id == session_id,
                Booking.status.in_(REFUNDABLE_ON_CLASS_CANCEL),
            )
        )
    )

    # 2. Khoá gói theo id tăng dần.
    credit_ledger.lock_packages(db, package_ids)

    # 3. Khoá buổi lớp, đặt trạng thái TRƯỚC khi hoàn.
    class_session = db.scalar(
        select(ClassSession).where(ClassSession.id == session_id).with_for_update()
    )
    if class_session is None:
        raise NotFoundError("Không tìm thấy buổi lớp.")
    if class_session.status is SessionStatus.CANCELLED:
        raise BusinessError("SESSION_ALREADY_CANCELLED", "Buổi lớp này đã bị hủy.")
    _assert_no_attendance(db, session_id)

    class_session.status = SessionStatus.CANCELLED
    class_session.cancel_reason = reason
    class_session.cancelled_by = actor_user_id
    class_session.cancelled_at = now()
    db.flush()

    # 4. Đọc LẠI dưới khoá — có thể có người vừa chen vào ở bước 1→3.
    bookings = list(
        db.scalars(
            select(Booking)
            .where(
                Booking.class_session_id == session_id,
                Booking.status.in_(REFUNDABLE_ON_CLASS_CANCEL),
            )
            .with_for_update()
        )
    )

    refunded: list[int] = []
    for booking in bookings:
        booking.status = BookingStatus.CANCELLED_INTIME
        booking.cancelled_at = now()
        booking.cancelled_by_user_id = actor_user_id
        db.flush()
        credit_ledger.record(
            db,
            student_package_id=booking.student_package_id,
            delta=1,
            reason=LedgerReason.CANCEL_REFUND,
            actor_user_id=actor_user_id,
            booking_id=booking.id,
            note=f"Studio hủy lớp #{session_id}: {reason}",
        )
        refunded.append(booking.id)

    # Dọn dữ liệu hàng chờ lịch sử; tính năng đã bỏ, bảng cũ được giữ.
    waiting = list(
        db.scalars(
            select(WaitlistEntry).where(
                WaitlistEntry.class_session_id == session_id,
                # Bao gồm cả lượt chuyển thất bại còn mở trong dữ liệu cũ.
                WaitlistEntry.status.in_(OPEN_WAITLIST_STATUSES),
            )
        )
    )
    for entry in waiting:
        entry.status = WaitlistStatus.CANCELLED
        entry.cancelled_by_user_id = actor_user_id
        entry.cancelled_at = now()
    db.flush()

    return CancelOutcome(
        session_id=session_id,
        refunded_booking_ids=refunded,
        cancelled_waitlist_ids=[entry.id for entry in waiting],
    )
