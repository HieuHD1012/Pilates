"""Danh sách nhắc gia hạn.

Rủi ro chính không phải ở truy vấn mà ở **phép logic**: ngưỡng là "≤6 buổi
HOẶC ≤15 ngày". Hiểu nhầm thành VÀ thì danh sách vẫn chạy, vẫn có người trong
đó, và không gì báo — chỉ có nhóm khách thoả đúng một điều kiện lặng lẽ biến
mất. Vì thế hai test quan trọng nhất ở đây là hai nhánh **chỉ thoả một vế**.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from sqlalchemy.orm import Session

from app.domain.rules import RENEWAL_THRESHOLD, ClassType, Role, now, today
from app.services import booking_service, renewal_query
from app.services.renewal_query import REASON_EXPIRING_SOON, REASON_LOW_CREDITS
from tests.conftest import auth_header, login, make_user
from tests.factories import (
    actor_for,
    give_package,
    make_session,
    make_student,
    make_student_account,
    make_trainer,
)


def _names(rows) -> set[str]:
    return {row.student_name for row in rows}


@pytest.fixture
def admin(db: Session):
    return make_user(db, Role.ADMIN)


def test_student_low_on_credits_but_far_from_expiry_is_listed(
    db: Session, admin
) -> None:
    """Chỉ thoả vế **số buổi**: còn 6 buổi, hạn còn 60 ngày."""
    student = make_student(db, "Hết Buổi Chưa Hết Hạn")
    give_package(
        db,
        student,
        admin.id,
        credits=RENEWAL_THRESHOLD["credits"],
        end_offset_days=60,
    )
    db.commit()

    rows = renewal_query.candidates(db)
    assert _names(rows) == {"Hết Buổi Chưa Hết Hạn"}
    assert rows[0].reasons == (REASON_LOW_CREDITS,)


def test_student_expiring_soon_but_rich_in_credits_is_listed(
    db: Session, admin
) -> None:
    """Chỉ thoả vế **ngày**: còn 20 buổi, hạn còn 10 ngày.

    Đây chính là người bị bỏ sót nếu ai đó đọc ngưỡng thành VÀ — và cũng là
    người studio cần gọi nhất, vì họ đang mất tiền đã trả.
    """
    student = make_student(db, "Còn Nhiều Buổi Sắp Hết Hạn")
    give_package(db, student, admin.id, credits=20, end_offset_days=10)
    db.commit()

    rows = renewal_query.candidates(db)
    assert _names(rows) == {"Còn Nhiều Buổi Sắp Hết Hạn"}
    assert rows[0].reasons == (REASON_EXPIRING_SOON,)


def test_student_meeting_both_conditions_shows_both_reasons(
    db: Session, admin
) -> None:
    student = make_student(db, "Sắp Hết Cả Hai")
    give_package(db, student, admin.id, credits=2, end_offset_days=5)
    db.commit()

    rows = renewal_query.candidates(db)
    assert rows[0].reasons == (REASON_LOW_CREDITS, REASON_EXPIRING_SOON)


def test_student_meeting_neither_condition_is_absent(db: Session, admin) -> None:
    student = make_student(db, "Chưa Cần Gọi")
    give_package(
        db,
        student,
        admin.id,
        credits=RENEWAL_THRESHOLD["credits"] + 1,
        end_offset_days=RENEWAL_THRESHOLD["days"] + 1,
    )
    db.commit()
    assert renewal_query.candidates(db) == []


def test_expired_package_leaves_the_list(db: Session, admin) -> None:
    """Gói hết hạn còn buổi **không** bị thu hồi, nhưng rời danh sách nhắc.

    Hệ quả trực tiếp của định nghĩa "gói đang hoạt động". Studio muốn vẫn gọi
    nhóm này thì cần một bộ lọc riêng — chưa thuộc phạm vi, đã ghi nhận ở
    `docs/business-rules.md`.
    """
    student = make_student(db, "Đã Hết Hạn")
    give_package(
        db, student, admin.id, credits=5, start_offset_days=-90, end_offset_days=-1
    )
    db.commit()
    assert renewal_query.candidates(db) == []


def test_credits_in_the_list_match_the_ledger(db: Session, admin) -> None:
    """Số buổi hiển thị phải là số buổi trong sổ, kể cả sau khi đã tiêu."""
    trainer = make_trainer(db)
    student, user = make_student_account(db, "Vừa Tập Vừa Sắp Hết")
    give_package(db, student, admin.id, credits=7, class_type=ClassType.GROUP)
    class_session = make_session(
        db, trainer, admin.id, starts_at=now() + timedelta(days=1)
    )
    booking_service.book(
        db,
        class_session_id=class_session.id,
        student_id=student.id,
        actor=actor_for(db, user),
    )
    db.commit()

    rows = renewal_query.candidates(db)
    assert [row.credits_remaining for row in rows] == [6]


def test_day_threshold_is_counted_in_studio_time(db: Session, admin) -> None:
    """Ngày biên tính theo giờ studio.

    Gói hết hạn đúng ngày thứ 15 vẫn **trong** danh sách, ngày thứ 16 thì
    không. Lệch 7 giờ ở phép lấy "hôm nay" sẽ đẩy một trong hai sang nhánh sai
    trong khoảng từ 00:00 đến 07:00 giờ Việt Nam mỗi ngày.
    """
    inside = make_student(db, "Đúng Ngày Thứ 15")
    outside = make_student(db, "Ngày Thứ 16")
    give_package(
        db, inside, admin.id, credits=30, end_offset_days=RENEWAL_THRESHOLD["days"]
    )
    give_package(
        db, outside, admin.id, credits=30, end_offset_days=RENEWAL_THRESHOLD["days"] + 1
    )
    db.commit()

    rows = renewal_query.candidates(db)
    assert _names(rows) == {"Đúng Ngày Thứ 15"}
    assert rows[0].days_remaining == RENEWAL_THRESHOLD["days"]
    assert rows[0].end_date == today() + timedelta(days=RENEWAL_THRESHOLD["days"])


# --- Ghi nhận chăm sóc -------------------------------------------------------


def test_contact_history_appends_and_never_overwrites(db: Session, admin) -> None:
    student = make_student(db, "Gọi Nhiều Lần")
    give_package(db, student, admin.id, credits=3)
    db.commit()

    renewal_query.record_contact(
        db, student_id=student.id, result="Chưa nghe máy", actor_user_id=admin.id
    )
    renewal_query.record_contact(
        db,
        student_id=student.id,
        result="Hẹn tuần sau qua studio",
        actor_user_id=admin.id,
        next_contact_date=today() + timedelta(days=7),
    )
    db.commit()

    history = renewal_query.contact_history(db, student.id)
    assert len(history) == 2
    assert [item.result for item in history] == [
        "Hẹn tuần sau qua studio",
        "Chưa nghe máy",
    ]

    rows = renewal_query.candidates(db)
    assert rows[0].last_contact_result == "Hẹn tuần sau qua studio"
    assert rows[0].next_contact_date == today() + timedelta(days=7)


def test_filter_separates_already_contacted_from_not_yet(db: Session, admin) -> None:
    called = make_student(db, "Đã Gọi")
    not_called = make_student(db, "Chưa Gọi")
    give_package(db, called, admin.id, credits=3)
    give_package(db, not_called, admin.id, credits=3)
    renewal_query.record_contact(
        db, student_id=called.id, result="Đã tư vấn gói mới", actor_user_id=admin.id
    )
    db.commit()

    assert _names(renewal_query.candidates(db, contacted=False)) == {"Chưa Gọi"}
    assert _names(renewal_query.candidates(db, contacted=True)) == {"Đã Gọi"}


def test_summary_counts_people_and_no_money(db: Session, admin, client) -> None:
    """Bảng tổng hợp chỉ đếm người cần liên hệ.

    Khẳng định vào **tập khoá của response**: một con số doanh thu lọt vào đây
    sẽ hiện trên màn hình quầy lễ tân, nơi khách đứng nhìn được.
    """
    low = make_student(db, "Sắp Hết Buổi")
    soon = make_student(db, "Sắp Hết Hạn")
    give_package(db, low, admin.id, credits=2, end_offset_days=90)
    give_package(db, soon, admin.id, credits=40, end_offset_days=3)
    renewal_query.record_contact(
        db, student_id=low.id, result="Đã gọi", actor_user_id=admin.id
    )
    db.commit()

    token = login(client, admin.email)["access_token"]
    response = client.get("/renewals/summary", headers=auth_header(token))
    assert response.status_code == 200, response.text
    body = response.json()

    assert set(body) == {
        "needing_contact",
        "low_credits",
        "expiring_soon",
        "never_contacted",
    }
    assert body == {
        "needing_contact": 2,
        "low_credits": 1,
        "expiring_soon": 1,
        "never_contacted": 1,
    }


def test_students_cannot_read_the_renewal_list(db: Session, client, admin) -> None:
    student, user = make_student_account(db, "Học viên Tò Mò")
    give_package(db, student, admin.id, credits=2)
    db.commit()

    token = login(client, user.email)["access_token"]
    assert client.get("/renewals", headers=auth_header(token)).status_code == 403
    assert client.get("/renewals/summary", headers=auth_header(token)).status_code == 403


def test_recording_a_contact_strips_markup(db: Session, client, admin) -> None:
    student = make_student(db, "Khách Gõ Thẻ")
    give_package(db, student, admin.id, credits=2)
    db.commit()

    token = login(client, admin.email)["access_token"]
    response = client.post(
        "/renewals/contacts",
        json={
            "student_id": student.id,
            "result": "<script>alert(1)</script>Khách nói sẽ gia hạn",
        },
        headers=auth_header(token),
    )
    assert response.status_code == 201, response.text
    assert "<script>" not in response.json()["result"]
    assert "Khách nói sẽ gia hạn" in response.json()["result"]


# --- Bộ lọc của màn hình -----------------------------------------------------


def test_credit_filter_narrows_the_list(db: Session, admin) -> None:
    """`max_credits` phải **thu hẹp** danh sách, không phải là tham số trang trí."""
    urgent = make_student(db, "Còn Hai Buổi")
    later = make_student(db, "Còn Sáu Buổi")
    give_package(db, urgent, admin.id, credits=2, end_offset_days=90)
    give_package(db, later, admin.id, credits=6, end_offset_days=90)
    db.commit()

    assert _names(renewal_query.candidates(db)) == {"Còn Hai Buổi", "Còn Sáu Buổi"}
    assert _names(renewal_query.candidates(db, max_credits=2)) == {"Còn Hai Buổi"}
    assert renewal_query.candidates(db, max_credits=1) == []


def test_day_filter_narrows_the_list(db: Session, admin) -> None:
    soon = make_student(db, "Hết Hạn Sau Ba Ngày")
    later = make_student(db, "Hết Hạn Sau Mười Ngày")
    give_package(db, soon, admin.id, credits=30, end_offset_days=3)
    give_package(db, later, admin.id, credits=30, end_offset_days=10)
    db.commit()

    assert len(renewal_query.candidates(db)) == 2
    assert _names(renewal_query.candidates(db, max_days=3)) == {"Hết Hạn Sau Ba Ngày"}


def test_filters_run_in_the_query_not_after_the_page_limit(db: Session, admin) -> None:
    """Lọc **trước** `LIMIT`, không phải sau.

    Lọc bằng Python trên trang đầu nghĩa là "còn ≤1 buổi" chỉ tìm trong số
    người lọt vào trang đó. Người đứng cuối danh sách biến mất khỏi kết quả mà
    không gì báo — và họ chính là người sắp hết buổi nhất.
    """
    for index in range(5):
        student = make_student(db, f"Xếp Trước {index}")
        give_package(db, student, admin.id, credits=5, end_offset_days=10 + index)
    needle = make_student(db, "Người Cần Tìm")
    give_package(db, needle, admin.id, credits=1, end_offset_days=80)
    db.commit()

    # Trang chỉ chứa hai người đầu, còn người cần tìm đứng cuối theo `end_date`.
    assert _names(renewal_query.candidates(db, max_credits=1, limit=2)) == {
        "Người Cần Tìm"
    }


def test_summary_is_not_capped_by_the_list_page_size(db: Session, admin) -> None:
    """Con số tổng hợp không được chặn trần theo kích thước trang.

    Chặn trần thì nó **đứng yên** khi studio vượt mốc đó, và không gì báo.
    """
    for index in range(7):
        student = make_student(db, f"Cần Gọi {index}")
        give_package(db, student, admin.id, credits=3)
    db.commit()

    assert renewal_query.summary(db).needing_contact == 7
    assert len(renewal_query.candidates(db, limit=3)) == 3
