"""Biên quy tắc hủy, chạy dưới **cả hai múi giờ tiến trình**.

Vì sao phải là hai: độ lệch giữa `UTC` và `Asia/Ho_Chi_Minh` là 7 giờ, vượt cả
ngưỡng 4 giờ của lớp Group lẫn 1 giờ của lớp Private. Một phép quy đổi sai ở
đâu đó sẽ khiến **mọi** lần hủy muộn được hoàn buổi — và một bộ test viết trên
chính phép quy đổi sai đó vẫn xanh.

Nên test ở đây không so kết quả với một con số viết tay; nó so **kết quả dưới
UTC với kết quả dưới giờ studio**, và đòi chúng bằng nhau. Đó là mệnh đề duy
nhất một lỗi múi giờ không thể thoả mãn.
"""

from __future__ import annotations

import os
import time
from datetime import timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.domain.rules import CANCEL_CUTOFF, BookingStatus, ClassType, Role, now
from app.models.scheduling import Booking
from app.services import booking_service, credit_ledger
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import make_user
from tests.factories import (
    actor_for,
    give_package,
    make_session,
    make_student_account,
    make_trainer,
)

#: Khoảng đệm hai phía mốc hạn. Đủ lớn để độ trễ của test không đẩy kết quả
#: sang nhánh kia, đủ nhỏ để vẫn là một phép đo ở biên.
MARGIN = timedelta(seconds=90)


@pytest.fixture(params=["UTC", "Asia/Ho_Chi_Minh"])
def process_timezone(request) -> str:
    """Đổi múi giờ của **tiến trình**, không phải của dữ liệu.

    Container chạy UTC theo mặc định còn máy dev chạy giờ Việt Nam; đây là đúng
    hai môi trường mã này sống, và kết quả nghiệp vụ phải giống nhau ở cả hai.
    """
    previous = os.environ.get("TZ")
    os.environ["TZ"] = request.param
    time.tzset()
    yield request.param
    if previous is None:
        os.environ.pop("TZ", None)
    else:
        os.environ["TZ"] = previous
    time.tzset()


def _cancel_outcome(
    db: Session, *, class_type: ClassType, starts_in: timedelta, expect_closed: bool = False
) -> bool:
    """Đặt một buổi lớp bắt đầu sau `starts_in`, hủy ngay, trả về có hoàn không."""
    admin = make_user(db, Role.ADMIN)
    trainer = make_trainer(db)
    student, user = make_student_account(db)
    package = give_package(db, student, admin.id, credits=5, class_type=class_type)
    capacity = 1 if class_type is ClassType.PRIVATE else 6
    class_session = make_session(
        db,
        trainer,
        admin.id,
        starts_at=now() + starts_in,
        class_type=class_type,
        capacity=capacity,
    )
    actor = actor_for(db, user)
    outcome = booking_service.book(
        db,
        class_session_id=class_session.id,
        student_id=student.id,
        actor=actor,
    )
    db.commit()
    if expect_closed:
        with pytest.raises(BusinessError) as exc:
            booking_service.cancel_booking(db, booking_id=outcome.booking.id, actor=actor)
        assert exc.value.code == "CANCELLATION_CLOSED"
        db.rollback()
        assert db.get(Booking, outcome.booking.id).status is BookingStatus.BOOKED
        assert credit_ledger.balance_of(db, package.id) == 4
        assert_ledger_is_sound(db)
        return False
    result = booking_service.cancel_booking(db, booking_id=outcome.booking.id, actor=actor)
    db.commit()

    expected = 5 if result.refunded else 4
    assert credit_ledger.balance_of(db, package.id) == expected
    return result.refunded


@pytest.mark.parametrize("class_type", [ClassType.GROUP, ClassType.PRIVATE])
def test_cancel_just_inside_the_cutoff_refunds_in_every_timezone(
    db: Session, process_timezone: str, class_type: ClassType
) -> None:
    refunded = _cancel_outcome(
        db, class_type=class_type, starts_in=CANCEL_CUTOFF[class_type] + MARGIN
    )
    assert refunded is True, f"TZ={process_timezone}, loại lớp={class_type.value}"


@pytest.mark.parametrize("class_type", [ClassType.GROUP, ClassType.PRIVATE])
def test_cancel_just_past_the_cutoff_is_locked_in_every_timezone(
    db: Session, process_timezone: str, class_type: ClassType
) -> None:
    refunded = _cancel_outcome(
        db, class_type=class_type, starts_in=CANCEL_CUTOFF[class_type] - MARGIN, expect_closed=True
    )
    assert refunded is False, f"TZ={process_timezone}, loại lớp={class_type.value}"


def test_a_group_class_inside_the_private_window_still_uses_the_group_rule(
    db: Session, process_timezone: str
) -> None:
    """Hai ngưỡng khác nhau, không được lẫn.

    Lớp Group còn 2 giờ nữa: dưới ngưỡng 4 giờ của Group nên **bị khóa hủy**, dù
    nó vẫn nằm ngoài ngưỡng 1 giờ của Private. Dùng nhầm ngưỡng ở đây là cách
    studio trả buổi cho mọi lần hủy sát giờ.
    """
    assert (
        _cancel_outcome(
            db, class_type=ClassType.GROUP, starts_in=timedelta(hours=2), expect_closed=True
        )
        is False
    )


def test_an_early_morning_class_does_not_shift_a_day_under_utc(
    db: Session, process_timezone: str
) -> None:
    """Lớp 06:00 giờ studio là 23:00 hôm trước theo UTC.

    Đây là khung giờ mà một phép quy đổi qua ngày **theo giờ tiến trình** sẽ
    tính sang hôm trước, và mọi thứ neo vào "hôm nay" — hạn gói, danh sách nhắc
    gia hạn — lệch đi một ngày.
    """
    from zoneinfo import ZoneInfo

    from app.domain.rules import TIMEZONE, cancel_deadline

    studio_morning = now().astimezone(TIMEZONE).replace(
        hour=6, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)
    deadline = cancel_deadline(studio_morning, ClassType.GROUP)

    assert deadline.astimezone(TIMEZONE).hour == 2
    assert deadline.astimezone(ZoneInfo("UTC")).hour == 19
    assert deadline == studio_morning - timedelta(hours=4)
