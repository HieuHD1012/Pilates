"""Báo cáo.

Hai mệnh đề quan trọng nhất ở đây đều là mệnh đề **so sánh**, không phải so
với một con số viết tay:

1. Tổng trên báo cáo bằng tổng của danh sách chi tiết đứng sau nó. Một con số
   không mở ra được các dòng tạo nên nó thì không kiểm chứng được.
2. File xuất khớp màn hình. Lệch xảy ra khi ai đó viết truy vấn thứ hai cho
   file xuất, và người phát hiện sẽ là khách.
"""

from __future__ import annotations

import csv
import io
from datetime import date, datetime, time, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.domain.rules import TIMEZONE, ClassType, PaymentMethod, Role, now, today
from app.services import (
    booking_service,
    payments,
    report_queries,
    scheduling,
)
from tests.conftest import auth_header, login, make_user
from tests.factories import (
    actor_for,
    give_package,
    make_session,
    make_student,
    make_student_account,
    make_trainer,
)


@pytest.fixture
def admin(db: Session):
    return make_user(db, Role.ADMIN)


def _period_now() -> tuple:
    return report_queries.period_bounds(today() - timedelta(days=7), today())


def _confirmed_payment(db: Session, admin, student, amount: str, method=PaymentMethod.CASH):
    package = give_package(db, student, admin.id, credits=10)
    payment = payments.record_payment(
        db,
        student_package_id=package.id,
        amount=Decimal(amount),
        method=method,
        actor_user_id=admin.id,
    )
    payments.confirm_payment(db, payment_id=payment.id, actor_user_id=admin.id)
    db.commit()
    return package, payment


# --- Doanh thu ---------------------------------------------------------------


def test_revenue_counts_only_confirmed_payments(db: Session, admin) -> None:
    """`PENDING` là tiền chưa về, `VOID` là tiền đã huỷ. Cả hai ngoài doanh thu."""
    paid = make_student(db, "Đã Thu Tiền")
    pending = make_student(db, "Chưa Xác Nhận")
    voided = make_student(db, "Đã Huỷ Giao Dịch")

    _confirmed_payment(db, admin, paid, "2500000.00")

    pending_package = give_package(db, pending, admin.id, credits=10)
    payments.record_payment(
        db,
        student_package_id=pending_package.id,
        amount=Decimal("9999000.00"),
        method=PaymentMethod.CASH,
        actor_user_id=admin.id,
    )

    void_package = give_package(db, voided, admin.id, credits=10)
    void_payment = payments.record_payment(
        db,
        student_package_id=void_package.id,
        amount=Decimal("7777000.00"),
        method=PaymentMethod.TRANSFER,
        actor_user_id=admin.id,
    )
    payments.confirm_payment(db, payment_id=void_payment.id, actor_user_id=admin.id)
    payments.void_payment(
        db,
        payment_id=void_payment.id,
        actor_user_id=admin.id,
        reason="Khách chuyển nhầm tài khoản",
    )
    db.commit()

    start, end = _period_now()
    summary = report_queries.revenue_summary(db, period_start=start, period_end=end)
    assert summary.total == Decimal("2500000.00")
    assert summary.payment_count == 1


def test_revenue_total_equals_the_sum_of_its_detail_rows(db: Session, admin) -> None:
    for index, amount in enumerate(["1000000.00", "2500000.00", "500000.00"]):
        student = make_student(db, f"Khách {index}")
        method = PaymentMethod.CASH if index % 2 == 0 else PaymentMethod.TRANSFER
        _confirmed_payment(db, admin, student, amount, method)

    start, end = _period_now()
    summary = report_queries.revenue_summary(db, period_start=start, period_end=end)
    rows = report_queries.revenue_detail(db, period_start=start, period_end=end)

    assert summary.total == sum(row.amount for row in rows)
    assert summary.payment_count == len(rows)
    assert sum(item.total for item in summary.by_method) == summary.total


def test_a_payment_confirmed_at_studio_dawn_belongs_to_that_day(db: Session, admin) -> None:
    """06:00 giờ studio là 23:00 hôm trước theo UTC.

    Biên kỳ tính theo giờ tiến trình sẽ đẩy giao dịch này sang kỳ trước, và báo
    cáo tháng nào cũng thiếu vài giao dịch đầu tháng mà không ai biết vì sao.
    """
    student = make_student(db, "Khách Sáng Sớm")
    _, payment = _confirmed_payment(db, admin, student, "3000000.00")

    dawn = now().astimezone(TIMEZONE).replace(hour=6, minute=0, second=0, microsecond=0)
    payment.confirmed_at = dawn
    db.commit()

    start, end = report_queries.period_bounds(dawn.date(), dawn.date())
    assert report_queries.revenue_summary(db, period_start=start, period_end=end).total == Decimal(
        "3000000.00"
    )

    previous = dawn.date() - timedelta(days=1)
    start, end = report_queries.period_bounds(previous, previous)
    assert report_queries.revenue_summary(db, period_start=start, period_end=end).total == Decimal(
        "0.00"
    )


# --- Lớp và đăng ký ----------------------------------------------------------


def test_cancelled_classes_leave_the_fill_rate_denominator(db: Session, admin) -> None:
    """Giữ lớp đã hủy trong mẫu số thì một tuần studio đóng cửa hiện thành một
    tuần ế khách."""
    trainer = make_trainer(db)
    student, user = make_student_account(db, "Học viên Đi Tập")
    give_package(db, student, admin.id, credits=10)

    live = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1), capacity=4)
    dead = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=2), capacity=4)
    booking_service.book(
        db, class_session_id=live.id, student_id=student.id, actor=actor_for(db, user)
    )
    db.commit()
    scheduling.cancel_session(
        db, session_id=dead.id, actor_user_id=admin.id, reason="Bảo trì máy Reformer"
    )
    db.commit()

    start, end = report_queries.period_bounds(today(), today() + timedelta(days=7))
    stats = report_queries.class_stats(db, period_start=start, period_end=end)

    assert stats.scheduled_sessions == 1
    assert stats.cancelled_sessions == 1
    assert stats.total_capacity == 4
    assert stats.fill_rate == 0.25


def test_fill_rate_is_empty_not_zero_when_no_class_ran(db: Session, admin) -> None:
    """Không có lớp thì mức lấp đầy **không tồn tại**. 0% nói rằng lớp mở mà
    không ai đến — một sự thật khác hẳn."""
    start, end = report_queries.period_bounds(today(), today())
    assert report_queries.class_stats(db, period_start=start, period_end=end).fill_rate is None


# --- Huấn luyện viên ---------------------------------------------------------


def test_trainer_report_matches_the_trainer_detail_screen(db: Session, client, admin) -> None:
    """Hai màn hình, một con số.

    Chi tiết HLV (F04) và báo cáo HLV (F09) nói cùng một điều; chúng phải chạy
    cùng một phép đếm, không phải hai phép đếm giống nhau.
    """
    trainer = make_trainer(db, "HLV Thanh Hà")
    other = make_trainer(db, "HLV Không Dạy Buổi Nào")
    student, user = make_student_account(db, "Học viên Của Hà")
    give_package(db, student, admin.id, credits=10)

    reference = (
        now().astimezone(TIMEZONE).replace(day=15, hour=9, minute=0, second=0, microsecond=0)
    )
    for offset in (0, 1):
        class_session = make_session(
            db, trainer, admin.id, starts_at=reference + timedelta(days=offset)
        )
        if offset == 0:
            booking_service.book(
                db,
                class_session_id=class_session.id,
                student_id=student.id,
                actor=actor_for(db, user),
            )
    db.commit()

    token = login(client, admin.email)["access_token"]
    detail = client.get(
        "/classes/trainer-stats",
        params={"trainer_id": trainer.id, "year": reference.year, "month": reference.month},
        headers=auth_header(token),
    ).json()

    period_start, period_end = report_queries.month_bounds(reference.year, reference.month)
    report = {
        row.trainer_id: row
        for row in report_queries.trainer_stats(
            db, period_start=period_start, period_end=period_end
        )
    }

    assert detail["scheduled_sessions"] == report[trainer.id].scheduled_sessions == 2
    assert detail["total_bookings"] == report[trainer.id].total_bookings == 1
    # HLV chưa dạy buổi nào vẫn có mặt với số 0 — biến mất khỏi báo cáo là cách
    # một HLV rảnh cả tháng trở nên vô hình.
    assert report[other.id].scheduled_sessions == 0


def test_export_matches_the_screen_exactly(db: Session, client, admin) -> None:
    """File xuất và màn hình chạy **cùng một truy vấn**, cùng bộ lọc."""
    trainer = make_trainer(db, "HLV Ngọc Mai")
    make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    db.commit()

    token = login(client, admin.email)["access_token"]
    params = {
        "period_start": str(today()),
        "period_end": str(today() + timedelta(days=7)),
    }
    screen = client.get("/reports/trainers", params=params, headers=auth_header(token))
    assert screen.status_code == 200, screen.text

    exported = client.get(
        "/reports/trainers/export",
        params={**params, "format": "csv"},
        headers=auth_header(token),
    )
    assert exported.status_code == 200, exported.text
    assert exported.headers["content-type"].startswith("text/csv")

    rows = list(csv.reader(io.StringIO(exported.text.lstrip("﻿"))))
    assert rows[0] == ["Huấn luyện viên", "Số lớp", "Lớp đã hủy", "Lượt đăng ký"]
    assert [row[0] for row in rows[1:]] == [item["trainer_name"] for item in screen.json()]
    assert [int(row[1]) for row in rows[1:]] == [
        item["scheduled_sessions"] for item in screen.json()
    ]


def test_export_neutralises_a_trainer_name_that_looks_like_a_formula(
    db: Session, client, admin
) -> None:
    make_trainer(db, "=1+1")
    db.commit()

    token = login(client, admin.email)["access_token"]
    exported = client.get(
        "/reports/trainers/export", params={"format": "csv"}, headers=auth_header(token)
    )
    assert "'=1+1" in exported.text


# --- Thanh toán quá hạn và bảng tổng hợp -------------------------------------


def test_overdue_unconfirmed_payments_become_visible(db: Session, admin) -> None:
    """Buổi được cộng ngay khi bán gói, không đợi tiền về.

    Danh sách này là chỗ duy nhất khoảng lệch đó nhìn thấy được; thiếu nó thì
    một khoản `PENDING` bị bỏ quên sẽ nằm im mãi mãi.
    """
    student = make_student(db, "Nợ Tiền")
    package = give_package(db, student, admin.id, credits=10)
    payment = payments.record_payment(
        db,
        student_package_id=package.id,
        amount=Decimal("2500000.00"),
        method=PaymentMethod.TRANSFER,
        actor_user_id=admin.id,
    )
    payment.recorded_at = now() - timedelta(days=30)
    db.commit()

    rows = report_queries.unconfirmed_payments(db)
    assert [row.student_name for row in rows] == ["Nợ Tiền"]
    assert rows[0].days_pending >= 29

    assert report_queries.unconfirmed_payments(db, older_than_days=60) == []


def test_dashboard_shows_no_money_and_links_every_number(db: Session, client, admin) -> None:
    """Bảng tổng hợp mở suốt ngày ở quầy lễ tân, nơi khách nhìn được màn hình.

    Khẳng định vào **tập khoá của response**: một ô doanh thu lọt vào đây là
    lọt ra trước mặt khách.
    """
    trainer = make_trainer(db)
    student, user = make_student_account(db, "Học viên Hôm Nay")
    give_package(db, student, admin.id, credits=5, class_type=ClassType.GROUP)
    starts = now() + timedelta(minutes=90)
    class_session = make_session(db, trainer, admin.id, starts_at=starts)
    booking_service.book(
        db,
        class_session_id=class_session.id,
        student_id=student.id,
        actor=actor_for(db, user),
    )
    db.commit()

    token = login(client, admin.email)["access_token"]
    body = client.get("/reports/dashboard", headers=auth_header(token)).json()

    keys = {number["key"] for number in body["numbers"]}
    assert keys == {
        "sessions_today",
        "bookings_today",
        "renewals_needing_contact",
        "unconfirmed_payments",
    }
    assert all(number["detail_path"] for number in body["numbers"])
    assert "revenue" not in str(keys)
    assert body["sessions_today"][0]["booked_count"] == 1


def test_students_cannot_read_reports(db: Session, client, admin) -> None:
    student, user = make_student_account(db, "Học viên Tò Mò")
    db.commit()
    token = login(client, user.email)["access_token"]
    for path in ["/reports/dashboard", "/reports/revenue", "/reports/trainers"]:
        assert client.get(path, headers=auth_header(token)).status_code == 403


# --- Con số phải mở ra được danh sách khớp với nó ----------------------------


def test_class_report_number_matches_the_list_behind_its_own_link(
    db: Session, client, admin
) -> None:
    """Đi theo đúng `detail_path` mà báo cáo tự sinh ra, rồi đếm.

    Đây là tiêu chí *"mọi con số mở ra được danh sách chi tiết khớp với nó"*,
    phát biểu thành một mệnh đề kiểm được. Hai cách hỏng đều im lặng: biên cuối
    kỳ để hở làm mất trọn ngày cuối, và mốc thời gian không kèm múi giờ bị đọc
    theo giờ container làm lệch thêm 7 tiếng.

    Buổi lớp đặt lúc **07:00 ngày cuối kỳ** vì đó là chỗ cả hai lỗi cùng lộ ra.
    """
    trainer = make_trainer(db, "HLV Cuối Kỳ")
    period_end = today() + timedelta(days=5)
    starts = datetime.combine(period_end, time(7, 0), tzinfo=TIMEZONE)
    make_session(db, trainer, admin.id, starts_at=starts)
    db.commit()

    token = login(client, admin.email)["access_token"]
    report = client.get(
        "/reports/classes",
        params={"period_start": str(today()), "period_end": str(period_end)},
        headers=auth_header(token),
    ).json()
    assert report["scheduled_sessions"] == 1

    detail = client.get(report["detail_path"], headers=auth_header(token))
    assert detail.status_code == 200, detail.text
    assert len(detail.json()) == report["scheduled_sessions"]


def test_every_dashboard_number_opens_a_list_of_the_same_size(db: Session, client, admin) -> None:
    """Bốn con số, bốn đường dẫn, và mỗi đường dẫn phải trả về đúng ngần ấy dòng.

    Trỏ tới `/classes` hay `/bookings` trần thì đường dẫn trả về **toàn bộ**
    bảng — con số vẫn đúng, nhưng không còn đối chiếu được với gì cả.
    """
    trainer = make_trainer(db, "HLV Hôm Nay")
    student, user = make_student_account(db, "Học viên Hôm Nay")
    give_package(db, student, admin.id, credits=5)

    starts = now() + timedelta(minutes=90)
    class_session = make_session(db, trainer, admin.id, starts_at=starts)
    booking_service.book(
        db,
        class_session_id=class_session.id,
        student_id=student.id,
        actor=actor_for(db, user),
    )

    # Một người cần gọi gia hạn và một khoản tiền chưa xác nhận quá hạn, để cả
    # bốn con số đều khác 0.
    soon = make_student(db, "Sắp Hết Buổi")
    package = give_package(db, soon, admin.id, credits=2)
    payment = payments.record_payment(
        db,
        student_package_id=package.id,
        amount=Decimal("2500000.00"),
        method=PaymentMethod.CASH,
        actor_user_id=admin.id,
    )
    payment.recorded_at = now() - timedelta(days=30)
    db.commit()

    token = login(client, admin.email)["access_token"]
    dashboard = client.get("/reports/dashboard", headers=auth_header(token)).json()

    for number in dashboard["numbers"]:
        response = client.get(number["detail_path"], headers=auth_header(token))
        assert response.status_code == 200, f"{number['key']}: {response.text}"
        rows = response.json()
        assert len(rows) == number["value"], (
            f"{number['key']}: con số nói {number['value']}, "
            f"{number['detail_path']} trả về {len(rows)} dòng"
        )
        assert number["value"] > 0, f"{number['key']} không được là 0 trong test này"


def test_revenue_belongs_to_the_month_of_confirmation_not_of_recording(db: Session, admin) -> None:
    """Nhân viên nhận tiền mặt 28/10, quản lý xác nhận 03/11 → doanh thu tháng 11.

    Hai cột rất dễ lẫn vì ở phần lớn giao dịch chúng cách nhau vài phút. Chỉ ca
    này phân biệt được chúng, và nếu đổi nhầm sang `recorded_at` thì mọi khoản
    chờ xác nhận qua đêm cuối tháng nhảy sang kỳ trước — một kỳ đã chốt sổ.
    """
    student = make_student(db, "Khách Trả Tiền Mặt")
    _, payment = _confirmed_payment(db, admin, student, "4000000.00")

    recorded = datetime(2026, 10, 28, 19, 0, tzinfo=TIMEZONE)
    confirmed = datetime(2026, 11, 3, 9, 0, tzinfo=TIMEZONE)
    payment.recorded_at = recorded
    payment.confirmed_at = confirmed
    db.commit()

    october = report_queries.period_bounds(date(2026, 10, 1), date(2026, 10, 31))
    november = report_queries.period_bounds(date(2026, 11, 1), date(2026, 11, 30))

    assert report_queries.revenue_summary(
        db, period_start=october[0], period_end=october[1]
    ).total == Decimal("0.00")
    assert report_queries.revenue_summary(
        db, period_start=november[0], period_end=november[1]
    ).total == Decimal("4000000.00")


def _book(db, class_session, students: list) -> None:
    """Đặt chỗ cho nhiều học viên vào cùng một buổi, qua đúng service thật."""
    for student, user in students:
        booking_service.book(
            db,
            class_session_id=class_session.id,
            student_id=student.id,
            actor=actor_for(db, user),
        )


def test_class_size_table_counts_held_seats_not_attendance(db: Session, client, admin) -> None:
    """Sĩ số là **ghế đã giữ**, và lớp rỗng không thuộc cột nào.

    Người đặt chỗ rồi không đến vẫn chiếm ghế và HLV vẫn dạy đủ buổi, nên bảng
    này phải đếm cùng bộ trạng thái với báo cáo HLV. Lớp không ai đăng ký thì
    không có sĩ số, nên nó nằm ngoài năm cột — và tổng ở đây nhỏ hơn số buổi
    dạy đúng bằng số lớp rỗng.
    """
    trainer = make_trainer(db, "HLV Sĩ Số")
    idle = make_trainer(db, "HLV Chưa Dạy Buổi Nào")
    students = []
    for index in range(3):
        student, user = make_student_account(db, f"Học viên Demo 0{index + 1}")
        give_package(db, student, admin.id, credits=10)
        students.append((student, user))

    reference = (
        now().astimezone(TIMEZONE).replace(day=15, hour=9, minute=0, second=0, microsecond=0)
    )
    one, three, empty = (
        make_session(db, trainer, admin.id, starts_at=reference + timedelta(days=offset))
        for offset in (0, 1, 2)
    )
    _book(db, one, students[:1])
    _book(db, three, students)
    db.commit()

    period_start, period_end = report_queries.month_bounds(reference.year, reference.month)
    rows = {
        row.trainer_id: row
        for row in report_queries.trainer_class_sizes(
            db, period_start=period_start, period_end=period_end
        )
    }

    assert rows[trainer.id].sessions_by_size == {1: 1, 2: 0, 3: 1, 4: 0, 5: 0}
    assert rows[trainer.id].sessions_over_max == 0
    # Buổi không ai đăng ký có cột riêng: nó vẫn là một buổi đã xếp lịch.
    assert rows[trainer.id].sessions_empty == 1
    # Mỗi lớp còn hiệu lực rơi vào đúng một cột, nên tổng dòng phải khớp số
    # buổi dạy của báo cáo HLV. Bảng không cộng lại được thì không dùng để
    # trả công được.
    stats = report_queries.trainer_stats(
        db, period_start=period_start, period_end=period_end, trainer_id=trainer.id
    )[0]
    assert rows[trainer.id].total_sessions == stats.scheduled_sessions == 3
    # HLV rảnh cả kỳ vẫn có một dòng đủ cột số 0.
    assert rows[idle.id].sessions_by_size == {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    assert rows[idle.id].sessions_empty == 0
    assert rows[idle.id].total_sessions == 0


def test_class_size_table_keeps_classes_larger_than_five(db: Session, client, admin) -> None:
    """Lớp đông hơn năm người không được biến mất khỏi bảng.

    Sức chứa không bị chặn trần ở tầng dữ liệu. Bỏ lớp thứ sáu người đi là bỏ
    một buổi dạy có thật ra khỏi con số mà người ta dùng để trả công.
    """
    trainer = make_trainer(db, "HLV Lớp Đông")
    students = []
    for index in range(6):
        student, user = make_student_account(db, f"Học viên Demo 1{index}")
        give_package(db, student, admin.id, credits=10)
        students.append((student, user))

    reference = (
        now().astimezone(TIMEZONE).replace(day=15, hour=9, minute=0, second=0, microsecond=0)
    )
    crowded = make_session(db, trainer, admin.id, starts_at=reference, capacity=6)
    _book(db, crowded, students)
    db.commit()

    period_start, period_end = report_queries.month_bounds(reference.year, reference.month)
    row = report_queries.trainer_class_sizes(
        db, period_start=period_start, period_end=period_end, trainer_id=trainer.id
    )[0]

    assert row.sessions_by_size == {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    assert row.sessions_over_max == 1
    assert row.sessions_empty == 0
    assert row.total_sessions == 1


def test_class_size_endpoint_serves_the_same_numbers(db: Session, client, admin) -> None:
    """Màn hình và truy vấn là một; lớp đã huỷ không phải buổi dạy."""
    trainer = make_trainer(db, "HLV Mai Chi")
    student, user = make_student_account(db, "Học viên Demo 20")
    give_package(db, student, admin.id, credits=10)

    kept = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    dropped = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=2))
    _book(db, kept, [(student, user)])
    _book(db, dropped, [(student, user)])
    db.commit()
    scheduling.cancel_session(db, session_id=dropped.id, actor_user_id=admin.id, reason="HLV bận")
    db.commit()

    token = login(client, admin.email)["access_token"]
    response = client.get(
        "/reports/trainers/class-sizes",
        params={
            "period_start": str(today()),
            "period_end": str(today() + timedelta(days=7)),
        },
        headers=auth_header(token),
    )
    assert response.status_code == 200, response.text

    row = next(item for item in response.json() if item["trainer_id"] == trainer.id)
    assert row["size_1"] == 1
    assert row["sessions_over_max"] == 0
    # Lớp bị huỷ tường minh không phải "lớp không có học viên": nó ra khỏi
    # bảng hẳn, vì không còn là buổi đã xếp lịch.
    assert row["sessions_empty"] == 0
    assert row["total_sessions"] == 1


def test_class_size_table_is_staff_only(db: Session, client, admin) -> None:
    """Học viên không được đọc bảng dùng để trả công."""
    _, user = make_student_account(db, "Học viên Demo 30")
    token = login(client, user.email)["access_token"]
    response = client.get("/reports/trainers/class-sizes", headers=auth_header(token))
    assert response.status_code == 403, response.text


def test_class_size_export_matches_the_screen_exactly(db: Session, client, admin) -> None:
    """File xuất chạy **cùng truy vấn** với màn hình, cùng bộ lọc."""
    trainer = make_trainer(db, "HLV Xuất File")
    student, user = make_student_account(db, "Học viên Demo 40")
    give_package(db, student, admin.id, credits=10)

    booked = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=2))
    _book(db, booked, [(student, user)])
    db.commit()

    token = login(client, admin.email)["access_token"]
    params = {
        "period_start": str(today()),
        "period_end": str(today() + timedelta(days=7)),
    }
    screen = client.get("/reports/trainers/class-sizes", params=params, headers=auth_header(token))
    assert screen.status_code == 200, screen.text

    exported = client.get(
        "/reports/trainers/class-sizes/export",
        params={**params, "format": "csv"},
        headers=auth_header(token),
    )
    assert exported.status_code == 200, exported.text
    assert exported.headers["content-type"].startswith("text/csv")

    rows = list(csv.reader(io.StringIO(exported.text.lstrip("\ufeff"))))
    assert rows[0] == [
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
    assert [row[0] for row in rows[1:]] == [item["trainer_name"] for item in screen.json()]
    assert [int(row[-1]) for row in rows[1:]] == [item["total_sessions"] for item in screen.json()]
    exported_row = next(row for row in rows[1:] if row[0] == trainer.full_name)
    assert exported_row[1] == "1"
    assert exported_row[-2] == "1"
    assert exported_row[-1] == "2"


def test_class_size_export_is_staff_only(db: Session, client, admin) -> None:
    """File xuất phải khoá đúng như màn hình nó lấy số."""
    _, user = make_student_account(db, "Học viên Demo 41")
    token = login(client, user.email)["access_token"]
    response = client.get("/reports/trainers/class-sizes/export", headers=auth_header(token))
    assert response.status_code == 403, response.text


def test_dashboard_attention_is_finished_classes_pending_attendance(db, client, admin, monkeypatch):
    from sqlalchemy import select

    from app.domain.rules import BookingStatus
    from app.models.scheduling import Booking
    from app.services import attendance

    trainer_user = make_user(db, Role.TRAINER)
    trainer = make_trainer(db, user=trainer_user)
    student, user = make_student_account(db)
    give_package(db, student, admin.id)
    base = now() + timedelta(days=1)
    first = make_session(db, trainer, admin.id, starts_at=base)
    second = make_session(db, trainer, admin.id, starts_at=base + timedelta(hours=2))
    for session in (first, second):
        booking_service.book(
            db, class_session_id=session.id, student_id=student.id, actor=actor_for(db, user)
        )
    db.commit()
    headers = auth_header(login(client, admin.email)["access_token"])
    assert (
        client.get("/reports/dashboard", headers=headers).json()["sessions_needing_attention"] == []
    )
    at = first.ends_at
    monkeypatch.setattr(report_queries, "now", lambda: at)
    monkeypatch.setattr(attendance, "now", lambda: at)
    rows = client.get("/reports/dashboard", headers=headers).json()["sessions_needing_attention"]
    assert [row["class_session_id"] for row in rows] == [first.id]
    assert rows[0]["booked_count"] == 1
    booking = db.scalar(select(Booking).where(Booking.class_session_id == first.id))
    attendance.mark_attendance(
        db, booking_id=booking.id, status=BookingStatus.NO_SHOW, actor=actor_for(db, trainer_user)
    )
    db.commit()
    assert (
        client.get("/reports/dashboard", headers=headers).json()["sessions_needing_attention"] == []
    )


@pytest.mark.parametrize("attendance_status", ["ATTENDED", "NO_SHOW"])
def test_dashboard_and_detail_keep_marked_registration(
    db, client, admin, monkeypatch, attendance_status
):
    from app.domain.rules import BookingStatus
    from app.services import attendance

    trainer_user = make_user(db, Role.TRAINER)
    trainer = make_trainer(db, user=trainer_user)
    student, user = make_student_account(db)
    package = give_package(db, student, admin.id)
    session = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    booking = booking_service.book(
        db, class_session_id=session.id, student_id=student.id, actor=actor_for(db, user)
    ).booking
    db.commit()
    at = session.ends_at
    monkeypatch.setattr(report_queries, "now", lambda: at)
    monkeypatch.setattr(attendance, "now", lambda: at)
    monkeypatch.setattr("app.api.reports.now", lambda: at)
    headers = auth_header(login(client, admin.email)["access_token"])

    def number():
        body = client.get("/reports/dashboard", headers=headers).json()
        return next(n for n in body["numbers"] if n["key"] == "bookings_today")

    assert number()["value"] == 1
    attendance.mark_attendance(
        db,
        booking_id=booking.id,
        status=BookingStatus(attendance_status),
        actor=actor_for(db, trainer_user),
    )
    db.commit()
    value = number()
    assert value["label"] == "Lượt đăng ký lớp hôm nay"
    assert value["value"] == 1
    rows = client.get(value["detail_path"], headers=headers).json()
    assert len(rows) == 1
    assert rows[0]["status"] == attendance_status
    stats = report_queries.class_stats(
        db, period_start=session.starts_at, period_end=session.ends_at
    )
    assert stats.total_bookings == value["value"]
    db.expire_all()
    assert package.balance_cached == 9
