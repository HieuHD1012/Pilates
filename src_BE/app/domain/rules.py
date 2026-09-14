"""Quy tắc nghiệp vụ dẫn xuất — khai báo đúng một chỗ.

Mọi phase khác import từ đây. Không sao chép hằng số sang nơi khác: một ngưỡng
xuất hiện hai chỗ là một ngưỡng sẽ lệch nhau.
"""

from __future__ import annotations

import enum
import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")


class Role(enum.StrEnum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    TRAINER = "TRAINER"
    STUDENT = "STUDENT"


class ClassType(enum.StrEnum):
    GROUP = "GROUP"
    PRIVATE = "PRIVATE"


class UserStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    # Tài khoản nhập từ Excel: chưa có mật khẩu, kích hoạt qua email (F10).
    PENDING_ACTIVATION = "PENDING_ACTIVATION"


class StudentStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class LeadStatus(enum.StrEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    CONVERTED = "CONVERTED"
    LOST = "LOST"


class PackageStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class LedgerReason(enum.StrEnum):
    """`EXPIRY_FORFEIT` cố ý không tồn tại: gói hết hạn không thu hồi buổi chưa
    dùng, và không có chủ thể nào ghi được bút toán đó (F00/F05)."""

    PACKAGE_SOLD = "PACKAGE_SOLD"
    PACKAGE_RENEWED = "PACKAGE_RENEWED"
    BOOKING_DEDUCT = "BOOKING_DEDUCT"
    CANCEL_REFUND = "CANCEL_REFUND"
    ADMIN_ADJUST = "ADMIN_ADJUST"
    PAYMENT_VOID = "PAYMENT_VOID"


class PaymentMethod(enum.StrEnum):
    CASH = "CASH"
    TRANSFER = "TRANSFER"


class PaymentStatus(enum.StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    VOID = "VOID"


class SessionStatus(enum.StrEnum):
    SCHEDULED = "SCHEDULED"
    CANCELLED = "CANCELLED"


class BookingStatus(enum.StrEnum):
    BOOKED = "BOOKED"
    CANCELLED_INTIME = "CANCELLED_INTIME"
    CANCELLED_LATE = "CANCELLED_LATE"
    ATTENDED = "ATTENDED"
    NO_SHOW = "NO_SHOW"


#: Lượt đăng ký **còn giữ một ghế**.
#:
#: Đây là phép đếm quyết định `SESSION_FULL`, mức lấp đầy trong báo cáo, danh
#: sách điểm danh và "lượt đăng ký hôm nay" — nên nó phải là **một** định nghĩa.
#: Người đặt chỗ rồi không đến vẫn chiếm ghế đó và HLV vẫn dạy đủ buổi, vì vậy
#: NO_SHOW nằm trong tập này; đếm theo người có mặt sẽ cho một con số khác hẳn
#: và hai màn hình sẽ đá nhau.
#:
#: Đừng nhầm với `scheduling.REFUNDABLE_ON_CLASS_CANCEL`: tập đó hẹp hơn và trả
#: lời một câu hỏi khác — lượt nào được hoàn buổi khi studio hủy lớp.
HELD_BOOKING_STATUSES = (
    BookingStatus.BOOKED,
    BookingStatus.ATTENDED,
    BookingStatus.NO_SHOW,
)


class WaitlistStatus(enum.StrEnum):
    WAITING = "WAITING"
    PROMOTED = "PROMOTED"
    CANCELLED = "CANCELLED"
    PROMOTION_FAILED = "PROMOTION_FAILED"


#: Trạng thái mở trong dữ liệu hàng chờ lịch sử, dùng khi studio hủy lớp.
#: Tính năng hàng chờ đã bỏ theo chốt 2026-09-14; giữ enum để đọc dữ liệu cũ.
OPEN_WAITLIST_STATUSES = (WaitlistStatus.WAITING, WaitlistStatus.PROMOTION_FAILED)


# --- Ngưỡng nghiệp vụ (docs/nguon/pham-vi-xac-nhan.xlsx) ----------------------

#: Hủy còn ít nhất ngần này trước giờ học thì được hoàn buổi.
CANCEL_CUTOFF: dict[ClassType, timedelta] = {
    ClassType.GROUP: timedelta(hours=4),
    ClassType.PRIVATE: timedelta(hours=1),
}

#: Nhắc gia hạn khi còn ≤6 buổi HOẶC ≤15 ngày. Quan hệ là HOẶC, không phải VÀ.
RENEWAL_THRESHOLD = {"credits": 6, "days": 15}

#: Sức chứa cố định của lớp Private. Duo = Private sức chứa 2, nhân viên đặt tay.
PRIVATE_DEFAULT_CAPACITY = 1

#: Danh sách vận hành "thanh toán chưa xác nhận quá N ngày" (F09).
UNCONFIRMED_PAYMENT_ALERT_DAYS = 7


#: Số điện thoại hợp lệ: chữ số và các ký tự phân tách người ta hay gõ.
#: Không nhận chữ cái hay dấu ngoặc nhọn — `phone` là trường ngắn nhưng vẫn đủ
#: chỗ cho một payload như `<svg onload=...>`.
PHONE_PATTERN = r"^[0-9+()\s.\-]{6,32}$"

_PHONE_SEPARATORS = re.compile(r"[\s.\-()]")


def normalize_phone(value: str) -> str:
    """Dạng chuẩn của một số điện thoại, dùng để **so trùng**.

    `0900 000 055` và `0900000055` là cùng một người. Không chuẩn hoá thì chúng
    là hai bản ghi khác nhau, và mọi phép chặn trùng — học viên lẫn khách quan
    tâm — đều vòng qua được bằng một dấu cách.
    """
    return _PHONE_SEPARATORS.sub("", value.strip())


def now() -> datetime:
    """Thời điểm hiện tại, luôn aware, luôn theo múi giờ studio.

    Dùng hàm này thay cho `datetime.now()` ở mọi nơi — container chạy UTC theo
    mặc định và độ lệch 7 giờ vượt cả hai ngưỡng hủy 4h/1h.
    """
    return datetime.now(tz=TIMEZONE)


def as_studio_time(value: datetime | None) -> datetime | None:
    """Một mốc thời gian **không kèm múi giờ** nghĩa là giờ studio.

    Tham số thời gian trên query string thường được gõ tay hoặc dựng từ một ô
    chọn ngày, và đến nơi ở dạng naive. So một giá trị naive với cột
    `timestamptz` thì PostgreSQL diễn giải nó theo múi giờ **của kết nối** —
    UTC trên container — nên `?starts_from=2026-09-01` lặng lẽ lệch 7 giờ và
    một buổi lớp 06:00 rơi ra ngoài khoảng người dùng vừa chọn.

    Rule `DTZ` của ruff không phủ được chỗ này: giá trị do FastAPI dựng, không
    do mã ta gọi `datetime(...)`. Nên phép quy đổi phải nằm ở biên, đúng một
    chỗ, và mọi endpoint nhận mốc thời gian đều gọi nó.
    """
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=TIMEZONE)


def today() -> date:
    """Ngày hôm nay theo múi giờ studio, không phải theo giờ container."""
    return now().date()


def cancel_deadline(starts_at: datetime, class_type: ClassType) -> datetime:
    """Hạn cuối học viên được hủy và hoàn buổi."""
    return starts_at - CANCEL_CUTOFF[class_type]


def is_cancel_in_time(
    starts_at: datetime, class_type: ClassType, at: datetime | None = None
) -> bool:
    """Hủy vào thời điểm `at` có được hoàn buổi không.

    `starts_at` phải là aware; so sánh aware-với-aware nên kết quả không phụ
    thuộc `TZ` của tiến trình.
    """
    if starts_at.tzinfo is None:
        raise ValueError("starts_at phải là datetime có múi giờ (timestamptz)")
    return (at or now()) <= cancel_deadline(starts_at, class_type)
