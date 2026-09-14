"""Quy tắc múi giờ và mốc biên hủy lớp (F00).

Container chạy UTC theo mặc định, Việt Nam là UTC+7. Ngưỡng hủy là 4h (Group)
và 1h (Private) — **độ lệch 7 giờ vượt cả hai**, nên một phép quy đổi sai sẽ
làm mọi lần hủy muộn được hoàn buổi, trên mọi lớp, vĩnh viễn.

Bộ test này chạy hai lần với `TZ` khác nhau và khẳng định kết quả giống hệt.
Chạy một lần thôi thì test viết trên cùng phép quy đổi sai vẫn pass.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta

import pytest

from app.domain.rules import (
    TIMEZONE,
    ClassType,
    cancel_deadline,
    is_cancel_in_time,
    now,
    today,
)
from tests.conftest import studio_clock


@pytest.fixture(params=["UTC", "Asia/Ho_Chi_Minh"], autouse=True)
def process_timezone(request: pytest.FixtureRequest):
    """Đổi `TZ` của tiến trình để mọi test trong file chạy ở cả hai múi giờ."""
    original = os.environ.get("TZ")
    os.environ["TZ"] = request.param
    time.tzset()
    yield request.param
    if original is None:
        os.environ.pop("TZ", None)
    else:
        os.environ["TZ"] = original
    time.tzset()


def _class_at(hour: int, minute: int = 0) -> datetime:
    """Một buổi lớp lúc `hour:minute` giờ Việt Nam, ngày 20/10/2026."""
    return datetime(2026, 10, 20, hour, minute, tzinfo=TIMEZONE)


# --- Mốc biên Group (4 giờ) --------------------------------------------------


def test_group_cancel_exactly_at_cutoff_is_in_time() -> None:
    starts = _class_at(18)
    assert is_cancel_in_time(starts, ClassType.GROUP, at=_class_at(14))


def test_group_cancel_one_second_before_cutoff_is_in_time() -> None:
    starts = _class_at(18)
    at = _class_at(14) - timedelta(seconds=1)
    assert is_cancel_in_time(starts, ClassType.GROUP, at=at)


def test_group_cancel_one_second_after_cutoff_is_late() -> None:
    starts = _class_at(18)
    at = _class_at(14) + timedelta(seconds=1)
    assert not is_cancel_in_time(starts, ClassType.GROUP, at=at)


def test_group_cancel_three_hours_before_is_late() -> None:
    """3 giờ < ngưỡng 4 giờ. Đây là mốc mà lệch 7 giờ sẽ đảo ngược kết quả."""
    assert not is_cancel_in_time(_class_at(18), ClassType.GROUP, at=_class_at(15))


# --- Mốc biên Private (1 giờ) ------------------------------------------------


def test_private_cancel_exactly_at_cutoff_is_in_time() -> None:
    assert is_cancel_in_time(_class_at(18), ClassType.PRIVATE, at=_class_at(17))


def test_private_cancel_after_cutoff_is_late() -> None:
    at = _class_at(17) + timedelta(minutes=1)
    assert not is_cancel_in_time(_class_at(18), ClassType.PRIVATE, at=at)


def test_private_cancel_three_hours_before_is_in_time() -> None:
    """Cùng một thời điểm hủy cho kết quả **khác nhau** giữa Group và Private."""
    at = _class_at(15)
    assert is_cancel_in_time(_class_at(18), ClassType.PRIVATE, at=at)
    assert not is_cancel_in_time(_class_at(18), ClassType.GROUP, at=at)


# --- Bất biến chung ----------------------------------------------------------


def test_cancel_deadline_is_absolute_regardless_of_process_timezone() -> None:
    """Hạn hủy là một thời điểm tuyệt đối, không đổi theo `TZ` của tiến trình."""
    deadline = cancel_deadline(_class_at(18), ClassType.GROUP)
    assert deadline.timestamp() == _class_at(14).timestamp()


def test_early_morning_class_crosses_utc_date_boundary() -> None:
    """Lớp 06:00 giờ Việt Nam là 23:00 hôm trước theo UTC.

    Hạn hủy Group của nó rơi vào 02:00 VN = 19:00 UTC ngày hôm trước nữa — đúng
    chỗ một phép tính theo ngày dễ trượt sang ngày khác.
    """
    starts = datetime(2026, 10, 20, 6, 0, tzinfo=TIMEZONE)
    deadline = cancel_deadline(starts, ClassType.GROUP)
    assert deadline.astimezone(TIMEZONE).day == 20
    assert deadline.astimezone(TIMEZONE).hour == 2


def test_naive_datetime_is_rejected() -> None:
    """Không chấp nhận datetime không có múi giờ ở đường tính hạn hủy."""
    with pytest.raises(ValueError):
        is_cancel_in_time(datetime(2026, 10, 20, 18, 0), ClassType.GROUP)  # noqa: DTZ001


def test_now_and_today_follow_studio_timezone_not_process() -> None:
    """`now()` và `today()` theo giờ studio, bất kể `TZ` của tiến trình.

    So `today()` với `now().date()` là gần như tautology (hai vế cùng gọi
    `now()`), lại còn nhấp nháy quanh nửa đêm. Phép so có nghĩa là với đồng hồ
    hệ thống: chênh lệch giữa giờ studio và UTC luôn là +7, không đổi theo `TZ`
    của tiến trình vì Việt Nam không có giờ mùa hè.
    """
    from datetime import UTC, datetime, timedelta

    moment = now()
    assert moment.tzinfo is TIMEZONE
    assert moment.utcoffset() == timedelta(hours=7)
    # `today()` phải là ngày của **cùng thời điểm đó** quy về giờ studio.
    assert today() == datetime.now(tz=UTC).astimezone(TIMEZONE).date()


def test_studio_clock_keeps_a_faked_now_in_studio_timezone() -> None:
    """Đồng hồ giả của test phải giữ đúng hợp đồng của `now()`.

    Mã sản phẩm lấy `now().date()` để quyết định "hôm nay là ngày nào"
    (`report_queries.sessions_today`). Mốc thời gian đọc lại từ PostgreSQL về
    theo múi giờ của kết nối — UTC trên container — nên gắn thẳng nó vào
    `monkeypatch` là thay `now()` bằng một hàm trả về ngày của UTC.

    Bẫy này chỉ sập trong khung 00:00–07:00 giờ Việt Nam, khi hai ngày khác
    nhau; chạy lúc 14:00 thì test xanh. Nó từng làm ba test đỏ ở một lượt chạy
    lúc 02:45 và xanh lại vào ban ngày — nên phép kiểm ở đây dùng **mốc thời
    gian cố định**, không dùng đồng hồ hệ thống.
    """
    from datetime import UTC

    # 19:30 UTC ngày 14 = 02:30 giờ studio ngày 15 — đúng khung gây lỗi.
    utc_moment = datetime(2026, 9, 14, 19, 30, tzinfo=UTC)
    assert utc_moment.date().day == 14

    faked = studio_clock(utc_moment)()
    assert faked.tzinfo is TIMEZONE
    assert faked.date().day == 15
    # Vẫn đúng một thời điểm, chỉ đổi cách đọc.
    assert faked.timestamp() == utc_moment.timestamp()
