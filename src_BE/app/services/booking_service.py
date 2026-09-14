"""Đăng ký, hủy và đổi lớp — **nguồn quy tắc duy nhất, gồm cả kiểm quyền**.

Chỉ STUDENT được đăng ký, hủy và đổi lớp cho chính mình.
Kiểm quyền nằm trong service và ở API để mọi lời gọi đều giữ cùng quy tắc.

**Bốn lớp phòng vệ** cho hai bất biến "không vượt sức chứa" và "không trừ đôi
buổi". Không lớp nào là thừa, và chúng chặn bốn kịch bản khác nhau:

1. `FOR UPDATE` trên `student_package` — bảo vệ **số dư**. Thiếu nó: học viên
   còn đúng 1 buổi đặt hai lớp **khác giờ** trong cùng một giây; hai transaction
   khoá hai hàng `class_session` khác nhau nên không hề tranh chấp, cả hai đọc
   số dư = 1, cả hai ghi −1. Một buổi mua được hai ghế.
2. `FOR UPDATE` trên `class_session` — bảo vệ **sức chứa**, và đọc lại trạng
   thái sau khi có khoá để không đặt vào lớp vừa bị hủy.
3. Partial unique index trên `booking` — chặn đặt trùng cùng lớp ở tầng CSDL.
4. `CHECK balance_cached >= 0` cùng constraint trigger đối soát — chặn số dư âm
   kể cả khi logic ở đây sai.

**Thứ tự khoá toàn cục: `student_package` (id tăng dần) trước `class_session`.**
Làm ngược lại thì luồng này và luồng hủy lớp khoá chéo nhau và deadlock ở đúng
đường chạy nhiều nhất trong ngày.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, ForbiddenError, NotFoundError
from app.core.permissions import Actor
from app.domain.rules import (
    TIMEZONE,
    BookingStatus,
    ClassType,
    LedgerReason,
    PackageStatus,
    Role,
    SessionStatus,
    is_cancel_in_time,
    now,
)
from app.models.money import StudentPackage
from app.models.people import Student
from app.models.scheduling import Booking, ClassSession
from app.services import credit_balance, credit_ledger, scheduling

_UNIQUE_BOOKING_INDEX = "uq_booking_active_per_student_session"
_PACKAGE_OWNERSHIP_FK = "fk_booking_package_belongs_to_student"


@dataclass(frozen=True)
class BookingOutcome:
    booking: Booking
    student_package_id: int
    credits_remaining: int


@dataclass(frozen=True)
class CancelBookingOutcome:
    booking_id: int
    status: BookingStatus
    refunded: bool
    credits_remaining: int


@dataclass(frozen=True)
class ChangeOutcome:
    cancelled: CancelBookingOutcome
    booked: BookingOutcome


# --- Quyền ------------------------------------------------------------------


def assert_can_act_on(actor: Actor, student_id: int, class_session: ClassSession) -> None:
    """Chỉ học viên được thao tác trên đăng ký của chính mình."""
    if actor.role is Role.STUDENT:
        if actor.student_id is None or actor.student_id != student_id:
            raise ForbiddenError("Bạn chỉ thao tác được trên lịch của chính mình.")
        return
    raise ForbiddenError()


# --- Đọc và chọn gói --------------------------------------------------------


def read_session(db: Session, class_session_id: int) -> ClassSession:
    class_session = db.get(ClassSession, class_session_id)
    if class_session is None:
        raise NotFoundError("Không tìm thấy buổi lớp.")
    return class_session


def assert_student_exists(db: Session, student_id: int) -> None:
    if db.get(Student, student_id) is None:
        raise NotFoundError("Không tìm thấy học viên.")


def _explain_no_package(
    db: Session,
    student_id: int,
    class_type: ClassType,
    session_date: date,
) -> BusinessError:
    """Vì sao học viên này không có gói dùng được cho lớp thuộc loại đó.

    "Hết buổi", "hết hạn", "sai loại gói" và "chưa có gói nào" là bốn thông báo
    khác nhau; gộp lại thành một câu "không đủ điều kiện" thì nhân viên đứng
    quầy không biết phải bán gì cho khách.
    """
    packages = credit_balance.all_packages(db, student_id)
    if not packages:
        return BusinessError("NO_PACKAGE", "Học viên chưa có gói tập nào.")

    matching = [item for item in packages if item.package.class_type_snapshot is class_type]
    if not matching:
        return BusinessError(
            "PACKAGE_TYPE_MISMATCH",
            f"Học viên không có gói cho lớp {class_type.value}.",
        )

    today_ = now().date()
    in_date = [
        item for item in matching if item.package.start_date <= today_ <= item.package.end_date
    ]
    if not in_date:
        return BusinessError("PACKAGE_EXPIRED", "Gói tập của học viên đã hết hạn.")
    valid_for_session = [
        item for item in in_date if item.package.start_date <= session_date <= item.package.end_date
    ]
    if not valid_for_session:
        return BusinessError("PACKAGE_NOT_VALID_FOR_SESSION", "Gói tập không còn hạn vào ngày học.")
    if all(item.credits_remaining <= 0 for item in valid_for_session):
        return BusinessError("PACKAGE_OUT_OF_CREDITS", "Gói tập đã hết buổi.")
    # Còn hạn, còn buổi, đúng loại mà vẫn không được chọn: chỉ còn khả năng gói
    # bị đánh dấu CANCELLED hoặc EXPIRED bằng tay.
    return BusinessError("PACKAGE_NOT_ACTIVE", "Gói tập không còn ở trạng thái hoạt động.")


def _select_package(
    db: Session,
    *,
    student_id: int,
    class_type: ClassType,
    student_package_id: int | None,
    session_date: date,
) -> StudentPackage:
    """Gói sẽ bị trừ buổi.

    Không chỉ định thì lấy gói **đang hoạt động, khớp loại lớp, `end_date` sớm
    nhất** — quy tắc tất định của F00, để hai lần đặt giống nhau không tiêu vào
    hai gói khác nhau.

    Chỉ định thì vẫn phải qua đủ các phép kiểm, **bao gồm quyền sở hữu**. Đây là
    lớp thứ nhất; composite FK `booking(student_id, student_package_id)` là lớp
    thứ hai. Thiếu cả hai thì học viên A truyền id gói của B và tập bằng buổi
    của B — và phép đối soát không thấy gì, vì bút toán gian lận vẫn là một dòng
    ledger thật.
    """
    if student_package_id is None:
        candidates = credit_balance.active_packages(
            db, student_id, class_type, on_date=session_date
        )
        if not candidates:
            raise _explain_no_package(db, student_id, class_type, session_date)
        return candidates[0].package

    package = db.get(StudentPackage, student_package_id)
    if package is None:
        raise NotFoundError("Không tìm thấy gói tập.")
    if package.student_id != student_id:
        # Cùng thông báo với "không tìm thấy" để không biến id gói thành một
        # kênh dò xem gói nào tồn tại.
        raise NotFoundError("Không tìm thấy gói tập.")

    matched = next(
        (
            item
            for item in credit_balance.active_packages(
                db, student_id, class_type, on_date=session_date
            )
            if item.package.id == package.id
        ),
        None,
    )
    if matched is None:
        if package.class_type_snapshot is not class_type:
            raise BusinessError(
                "PACKAGE_TYPE_MISMATCH",
                f"Gói '{package.name_snapshot}' không dùng được cho lớp {class_type.value}.",
            )
        if not package.start_date <= session_date <= package.end_date:
            raise BusinessError(
                "PACKAGE_NOT_VALID_FOR_SESSION", "Gói tập không còn hạn vào ngày học."
            )
        raise _explain_no_package(db, student_id, class_type, session_date)
    return matched.package


# --- Đăng ký ----------------------------------------------------------------


def _assert_session_bookable(class_session: ClassSession, at: datetime) -> None:
    if class_session.status is SessionStatus.CANCELLED:
        raise BusinessError("SESSION_CANCELLED", "Buổi lớp này đã bị hủy.")
    if class_session.starts_at <= at:
        raise BusinessError("SESSION_STARTED", "Buổi lớp này đã bắt đầu hoặc đã qua.")


def _translate_booking_conflict(exc: IntegrityError) -> BusinessError:
    text = str(exc.orig)
    if _UNIQUE_BOOKING_INDEX in text:
        return BusinessError("ALREADY_BOOKED", "Học viên đã đăng ký buổi lớp này.")
    if _PACKAGE_OWNERSHIP_FK in text:
        return BusinessError("PACKAGE_NOT_OWNED", "Gói tập không thuộc về học viên này.")
    if "khong nhan dang ky moi" in text:
        return BusinessError("SESSION_CANCELLED", "Buổi lớp này đã bị hủy.")
    raise exc


def book(
    db: Session,
    *,
    class_session_id: int,
    student_id: int,
    actor: Actor,
    student_package_id: int | None = None,
) -> BookingOutcome:
    """Đăng ký một buổi lớp và trừ 1 buổi — **một transaction**.

    Trình tự khoá không phải tuỳ chọn: gói trước, buổi lớp sau, và **mọi phép
    kiểm quyết định đều chạy lại sau khi có khoá**. Đếm chỗ trước khi khoá là
    đọc một con số hết hạn ngay lúc đọc xong.
    """
    class_session = read_session(db, class_session_id)
    assert_can_act_on(actor, student_id, class_session)
    assert_student_exists(db, student_id)
    _assert_session_bookable(class_session, now())

    package = _select_package(
        db,
        student_id=student_id,
        class_type=class_session.class_type,
        student_package_id=student_package_id,
        session_date=class_session.starts_at.astimezone(TIMEZONE).date(),
    )

    # 1. Khoá nguồn buổi.
    locked_package = credit_ledger.lock_package(db, package.id)

    # 2. Khoá ghế, rồi đọc lại trạng thái dưới khoá.
    class_session = db.scalar(
        select(ClassSession)
        .where(ClassSession.id == class_session_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if class_session is None:
        raise NotFoundError("Không tìm thấy buổi lớp.")
    _assert_session_bookable(class_session, now())

    # 3. Sức chứa — đếm dưới khoá.
    if locked_package.status is not PackageStatus.ACTIVE:
        raise BusinessError("PACKAGE_NOT_ACTIVE", "Gói tập không còn ở trạng thái hoạt động.")
    if locked_package.class_type_snapshot is not class_session.class_type:
        raise BusinessError("PACKAGE_TYPE_MISMATCH", "Gói không dùng được cho loại lớp này.")
    if not locked_package.start_date <= now().date() <= locked_package.end_date:
        raise BusinessError("PACKAGE_EXPIRED", "Gói tập chưa có hiệu lực hoặc đã hết hạn.")
    if (
        not locked_package.start_date
        <= class_session.starts_at.astimezone(TIMEZONE).date()
        <= locked_package.end_date
    ):
        raise BusinessError("PACKAGE_NOT_VALID_FOR_SESSION", "Gói tập không còn hạn vào ngày học.")
    if scheduling.booked_count(db, class_session_id) >= class_session.capacity:
        raise BusinessError("SESSION_FULL", "Buổi lớp đã hết chỗ.")

    booking = Booking(
        class_session_id=class_session_id,
        student_id=student_id,
        student_package_id=locked_package.id,
        status=BookingStatus.BOOKED,
        booked_by_user_id=actor.id,
    )
    db.add(booking)
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError as exc:
        raise _translate_booking_conflict(exc) from exc

    # 4. Trừ buổi — cùng transaction với dòng đăng ký. Tách ra là tách thành
    #    hai cơ hội để một vế được ghi còn vế kia thì không.
    credit_ledger.record(
        db,
        student_package_id=locked_package.id,
        delta=-1,
        reason=LedgerReason.BOOKING_DEDUCT,
        actor_user_id=actor.id,
        booking_id=booking.id,
        note=f"Đăng ký buổi lớp #{class_session_id}",
    )
    db.flush()
    return BookingOutcome(
        booking=booking,
        student_package_id=locked_package.id,
        # Tính từ sổ, không đọc `balance_cached` — cùng nguồn với đường hủy và
        # với mọi màn hình. `balance_cached` tồn tại để làm biểu diễn thứ hai
        # **độc lập**; đọc nó ra giao diện là hợp hai biểu diễn làm một, và một
        # sai lệch sẽ hiển thị đúng bằng chính giá trị sai.
        credits_remaining=credit_ledger.balance_of(db, locked_package.id),
    )


# --- Hủy --------------------------------------------------------------------


def refunds_on_cancel(
    *,
    starts_at: datetime,
    class_type: ClassType,
    at: datetime | None = None,
) -> bool:
    """Còn trong hạn hủy theo loại lớp thì hoàn buổi; không có ân hạn dời lịch.

    Không cần kiểm thêm "lớp chưa bắt đầu": mọi ngưỡng trong `CANCEL_CUTOFF` đều
    dương, nên còn trong hạn hủy đã hàm ý `at < starts_at`.
    """
    return is_cancel_in_time(starts_at, class_type, at or now())


def _get_booking(db: Session, booking_id: int) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Không tìm thấy lượt đăng ký.")
    return booking


def cancel_booking(
    db: Session, *, booking_id: int, actor: Actor, note: str | None = None
) -> CancelBookingOutcome:
    """Hủy đúng hạn hoàn 1 buổi; sau hạn khóa thao tác.

    **Idempotent bằng chính câu UPDATE**: `WHERE status = 'BOOKED'` cộng với
    phép kiểm `rowcount` là thứ chặn double-click. Kiểm trạng thái bằng một câu
    SELECT rồi mới UPDATE thì hai request đồng thời đều thấy `BOOKED` và cùng
    ghi một dòng hoàn: trả 1 buổi, nhận về 2, lặp lại được vô hạn. Partial
    unique index trên `credit_ledger(booking_id) WHERE CANCEL_REFUND` là lớp
    thứ hai.
    """
    booking = _get_booking(db, booking_id)
    class_session = read_session(db, booking.class_session_id)
    assert_can_act_on(actor, booking.student_id, class_session)

    # Khoá gói trước — đầu của thứ tự khoá toàn cục.
    credit_ledger.lock_package(db, booking.student_package_id)

    # Giữ khoá chia sẻ trên lớp trong lúc quyết định hủy và hoàn buổi để phối
    # hợp với các thao tác khóa lớp. Khoá lớp đứng sau khoá gói, đúng thứ tự
    # toàn cục; studio không có thao tác dời giờ lớp.
    row = db.execute(
        select(ClassSession.starts_at, ClassSession.class_type)
        .where(ClassSession.id == booking.class_session_id)
        .with_for_update(read=True)
    ).one()
    starts_at, class_type = row

    db.refresh(booking)
    if booking.status is not BookingStatus.BOOKED:
        raise BusinessError("BOOKING_NOT_ACTIVE", "Lượt đăng ký này không còn ở trạng thái đã đặt.")
    in_time = refunds_on_cancel(
        starts_at=starts_at,
        class_type=class_type,
    )
    if not in_time:
        raise BusinessError(
            "CANCELLATION_CLOSED", "Đã quá hạn hủy của lớp, không thể hủy hoặc đổi lớp."
        )
    new_status = BookingStatus.CANCELLED_INTIME

    result = db.execute(
        update(Booking)
        .where(Booking.id == booking_id, Booking.status == BookingStatus.BOOKED)
        .values(
            status=new_status,
            cancelled_at=now(),
            cancelled_by_user_id=actor.id,
        )
        .execution_options(synchronize_session=False)
    )
    if result.rowcount != 1:
        raise BusinessError("BOOKING_NOT_ACTIVE", "Lượt đăng ký này không còn ở trạng thái đã đặt.")
    db.expire(booking)

    if in_time:
        credit_ledger.record(
            db,
            student_package_id=booking.student_package_id,
            delta=1,
            reason=LedgerReason.CANCEL_REFUND,
            actor_user_id=actor.id,
            booking_id=booking_id,
            note=note or "Hủy đúng hạn",
        )
    db.flush()
    return CancelBookingOutcome(
        booking_id=booking_id,
        status=new_status,
        refunded=in_time,
        credits_remaining=credit_ledger.balance_of(db, booking.student_package_id),
    )


# --- Đổi lớp ----------------------------------------------------------------


def change_booking(
    db: Session,
    *,
    booking_id: int,
    new_class_session_id: int,
    actor: Actor,
    student_package_id: int | None = None,
) -> ChangeOutcome:
    """Đổi sang buổi lớp khác = hủy + đăng ký, **cùng transaction, cùng quy tắc
    hoàn**. Quá hạn hủy lớp cũ thì khóa đổi; lớp mới không hợp lệ thì
    toàn bộ giao dịch rollback, giữ nguyên đăng ký và số buổi.

    Khoá trước toàn bộ tập gói ứng viên và **cả hai buổi lớp theo `id` tăng
    dần**. Không làm vậy thì hai người đổi chéo nhau (A→B và B→A) khoá ngược
    thứ tự và deadlock.
    """
    booking = _get_booking(db, booking_id)
    if booking.class_session_id == new_class_session_id:
        raise BusinessError("SAME_SESSION", "Buổi lớp mới trùng với buổi đang đăng ký.")

    old_session = read_session(db, booking.class_session_id)
    new_session = read_session(db, new_class_session_id)
    assert_can_act_on(actor, booking.student_id, old_session)
    assert_can_act_on(actor, booking.student_id, new_session)

    candidate_ids = {booking.student_package_id}
    candidate_ids.update(
        item.package.id
        for item in credit_balance.active_packages(
            db,
            booking.student_id,
            new_session.class_type,
            on_date=new_session.starts_at.astimezone(TIMEZONE).date(),
        )
    )
    credit_ledger.lock_packages(db, sorted(candidate_ids))

    for session_id in sorted({booking.class_session_id, new_class_session_id}):
        db.execute(select(ClassSession.id).where(ClassSession.id == session_id).with_for_update())

    cancelled = cancel_booking(
        db, booking_id=booking_id, actor=actor, note=f"Đổi sang lớp #{new_class_session_id}"
    )
    booked = book(
        db,
        class_session_id=new_class_session_id,
        student_id=booking.student_id,
        actor=actor,
        student_package_id=student_package_id,
    )
    return ChangeOutcome(cancelled=cancelled, booked=booked)
