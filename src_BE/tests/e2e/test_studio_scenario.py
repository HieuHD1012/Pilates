"""Kịch bản đầu-cuối của một studio thật: 1 admin, 3 HLV, 8 học viên.

`test_main_flow.py` đi **một** chuỗi trên một studio tối giản. File này đi
**cả vận hành một ngày** trên một studio có đủ dữ liệu: tám học viên ở tám
trạng thái gói khác nhau, ba HLV với ba kiểu lịch, tiền ở cả ba trạng thái
`PENDING`/`CONFIRMED`/`VOID`, lớp Group lẫn Private, lớp bị dời và lớp bị hủy.

Vì sao cần cả hai: phần lớn lỗi còn sót ở loại ứng dụng này không nằm trong
một mắt xích mà nằm ở **chỗ nối giữa các màn hình** — số buổi trên hồ sơ học
viên khác số buổi trong sổ, danh sách nhắc gia hạn đếm một người hai lần,
báo cáo HLV cộng cả lớp đã hủy. Những sai lệch đó chỉ hiện ra khi có đủ dữ
liệu cho chúng lệch nhau, và không bộ test đơn vị nào dựng nổi bối cảnh đó.

Sau **mỗi** bước làm thay đổi số buổi, `assert_ledger_is_sound` chạy lại toàn
bộ bảy bất biến của sổ. Sổ lệch một dòng ở bước 3 mà đến bước 9 mới phát hiện
là mất cả buổi chiều để tìm.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook
from PIL import Image
from sqlalchemy.orm import Session

from app.domain.rules import RENEWAL_THRESHOLD, ClassType, Role, now, today
from app.services.ledger_invariants import assert_ledger_is_sound
from tests.conftest import TEST_PASSWORD, login, studio_clock
from tests.e2e.studio_stage import (
    ApiUser,
    Studio,
    build_studio,
    created,
    fails,
    ok,
    recurrence_payload,
    session_seats_left,
    student_credits,
)


@pytest.fixture
def studio(db: Session, client: TestClient) -> Studio:
    stage = build_studio(db, client)
    # Sân khấu phải đúng trước khi kịch bản bắt đầu: một seed sai làm mọi
    # khẳng định sau đó nói về một hệ thống khác.
    assert_ledger_is_sound(db)
    return stage


# --- 1. Dữ liệu nền -----------------------------------------------------------


def test_san_khau_co_du_tam_trang_thai_hoc_vien(studio: Studio, db: Session) -> None:
    admin = studio.admin

    accounts = ok(admin.get("/accounts"))
    by_role: dict[str, int] = {}
    for account in accounts:
        by_role[account["role"]] = by_role.get(account["role"], 0) + 1
    assert by_role == {"ADMIN": 1, "TRAINER": 3, "STUDENT": 8}

    assert len(ok(admin.get("/students"))) == 8
    assert len(ok(admin.get("/trainers"))) == 3

    # Mỗi vai nhìn thấy đúng danh tính nghiệp vụ của mình.
    assert ok(studio.trainers["mai"].get("/auth/me"))["trainer_id"] == studio.trainer_ids["mai"]
    assert ok(studio.students["lan"].get("/auth/me"))["student_id"] == studio.student_ids["lan"]
    assert ok(admin.get("/auth/me"))["role"] == "ADMIN"

    # Tám trạng thái gói, mỗi người một kiểu.
    assert student_credits(studio, "lan") == 20
    assert student_credits(studio, "minh") == 10
    assert student_credits(studio, "trang") == 5
    assert student_credits(studio, "huy") == 2, "Còn 2 buổi sau điều chỉnh tay."
    assert student_credits(studio, "phuong") == 10
    assert student_credits(studio, "nam") == 0, "Chưa mua gói nào."
    assert student_credits(studio, "ngan") == 10
    assert student_credits(studio, "yen") == 0, "Giao dịch bị huỷ thu hồi toàn bộ buổi."

    statuses = {row["id"]: row["status"] for row in ok(admin.get("/payments", limit=200))}
    assert statuses[studio.payment_ids["lan"]] == "CONFIRMED"
    assert statuses[studio.payment_ids["minh"]] == "PENDING"
    assert statuses[studio.payment_ids["yen"]] == "VOID"

    # Khách để lại số trên web đã thành học viên, và bản ghi tư vấn vẫn còn.
    lead = ok(admin.get(f"/leads/{studio.lead_id}"))
    assert lead["status"] == "CONVERTED"
    assert lead["converted_student_id"] == studio.student_ids["yen"]
    assert lead["source"] == "facebook"


# --- 2. Đăng ký, hủy, đổi lớp -------------------------------------------------


def test_vong_doi_dang_ky_cua_mot_hoc_vien(studio: Studio, db: Session) -> None:
    lan = studio.students["lan"]
    sessions = studio.session_ids

    booking = created(lan.post("/bookings", {"class_session_id": sessions["group_tomorrow"]}))
    assert booking["credits_remaining"] == 19
    assert_ledger_is_sound(db)

    row = ok(lan.get("/my-schedule"))[0]
    assert row["refund_if_cancelled_now"] is True
    assert row["can_cancel"] is True
    assert row["trainer_name"] == "HLV Ngọc Mai"

    # Đổi lớp = hủy + đăng ký, áp đúng quy tắc hoàn của lần hủy.
    change = ok(
        lan.post(
            f"/bookings/{booking['booking']['id']}/change",
            {"new_class_session_id": sessions["group_full"]},
        )
    )
    assert change["cancelled"]["refunded"] is True
    assert change["booked"]["credits_remaining"] == 19
    assert_ledger_is_sound(db)

    # Hủy đúng hạn → hoàn buổi, và chỗ được trả lại cho lớp.
    cancelled = ok(lan.post(f"/bookings/{change['booked']['booking']['id']}/cancel"))
    assert cancelled == {
        "booking_id": change["booked"]["booking"]["id"],
        "status": "CANCELLED_INTIME",
        "refunded": True,
        "credits_remaining": 20,
    }
    assert session_seats_left(studio, "group_full") == 1
    assert_ledger_is_sound(db)

    # Lớp bắt đầu sau 2 giờ, ngưỡng Group là 4 giờ → hủy không hoàn.
    late = created(lan.post("/bookings", {"class_session_id": sessions["group_soon"]}))
    assert_ledger_is_sound(db)
    late_row = next(
        item for item in ok(lan.get("/my-schedule")) if item["booking_id"] == late["booking"]["id"]
    )
    assert late_row["refund_if_cancelled_now"] is False
    assert late_row["can_cancel"] is False, "Sau hạn thì khóa hủy."

    fails(lan.post(f"/bookings/{late['booking']['id']}/cancel"), "CANCELLATION_CLOSED")
    assert student_credits(studio, "lan") == 19
    assert_ledger_is_sound(db)

    # Hủy lần hai không được hoàn thêm lần nữa.
    fails(lan.post(f"/bookings/{late['booking']['id']}/cancel"), "CANCELLATION_CLOSED")
    assert student_credits(studio, "lan") == 19
    assert_ledger_is_sound(db)


def test_bon_ly_do_khong_dat_duoc_lop_noi_ro_bon_cau_khac_nhau(studio: Studio, db: Session) -> None:
    """ "Chưa có gói", "sai loại gói", "hết buổi" và "hết chỗ" là bốn câu khác
    nhau — nhân viên đứng quầy cần biết phải bán gì cho khách."""
    sessions = studio.session_ids

    fails(
        studio.students["nam"].post("/bookings", {"class_session_id": sessions["group_tomorrow"]}),
        "NO_PACKAGE",
    )
    fails(
        studio.students["lan"].post("/bookings", {"class_session_id": sessions["private_solo"]}),
        "PACKAGE_TYPE_MISMATCH",
    )
    fails(
        studio.students["trang"].post(
            "/bookings", {"class_session_id": sessions["group_tomorrow"]}
        ),
        "PACKAGE_TYPE_MISMATCH",
    )

    # Gói Private dùng đúng lớp Private thì đi qua.
    duo = created(
        studio.students["trang"].post("/bookings", {"class_session_id": sessions["private_duo"]})
    )
    assert duo["credits_remaining"] == 4
    assert_ledger_is_sound(db)

    # Đặt trùng chính buổi đó.
    fails(
        studio.students["trang"].post("/bookings", {"class_session_id": sessions["private_duo"]}),
        "ALREADY_BOOKED",
    )

    # Gói của người khác: id đoán được, nên phép chặn phải nằm ở server.
    fails(
        studio.students["huy"].post(
            "/bookings",
            {
                "class_session_id": sessions["group_tomorrow"],
                "student_package_id": studio.package_ids["lan"],
            },
        ),
        "NOT_FOUND",
        status=404,
    )

    # Học viên không đặt thay người khác được.
    fails(
        studio.students["huy"].post(
            "/bookings",
            {
                "class_session_id": sessions["group_tomorrow"],
                "student_id": studio.student_ids["lan"],
            },
        ),
        "FORBIDDEN",
        status=403,
    )
    assert_ledger_is_sound(db)

    # Huy dùng hết 2 buổi còn lại: lỗi hết buổi khác với chưa có gói.
    ok(
        studio.admin.post(
            f"/packages/{studio.package_ids['huy']}/adjust",
            {"delta": -2, "reason": "Đối soát 2 buổi đã dùng trước khi chuyển hệ thống"},
        )
    )
    assert_ledger_is_sound(db)
    fails(
        studio.students["huy"].post("/bookings", {"class_session_id": sessions["group_tomorrow"]}),
        "PACKAGE_OUT_OF_CREDITS",
    )
    assert student_credits(studio, "huy") == 0
    assert_ledger_is_sound(db)


# --- 3. Lớp đầy và đăng ký khi có chỗ -----------------------------------------


def test_lop_day_tu_choi_va_hoc_vien_tu_dat_khi_co_cho(studio: Studio, db: Session) -> None:
    full = studio.session_ids["group_full"]
    ngan, lan = studio.students["ngan"], studio.students["lan"]
    booked = created(ngan.post("/bookings", {"class_session_id": full}))
    assert_ledger_is_sound(db)
    fails(lan.post("/bookings", {"class_session_id": full}), "SESSION_FULL")
    assert student_credits(studio, "lan") == 20
    assert full not in ok(lan.get("/my-schedule/bookable"))
    assert lan.post("/waitlist", {"class_session_id": full}).status_code == 404
    ok(ngan.post(f"/bookings/{booked['booking']['id']}/cancel"))
    assert_ledger_is_sound(db)
    assert session_seats_left(studio, "group_full") == 1
    assert full in ok(lan.get("/my-schedule/bookable"))
    assert created(lan.post("/bookings", {"class_session_id": full}))["credits_remaining"] == 19
    assert_ledger_is_sound(db)


def test_tao_lich_lap_roi_doi_hlv_doi_gio_va_huy_lop(studio: Studio, db: Session) -> None:
    admin = studio.admin
    payload = recurrence_payload(studio.trainer_ids["bao"])

    preview = ok(admin.post("/classes/recurrence/preview", payload))
    assert preview["conflict_count"] == 0
    assert preview["available_count"] == len(preview["occurrences"]) == 6

    batch = created(admin.post("/classes/recurrence", payload))
    assert len(batch["sessions"]) == 6
    assert all(item["recurrence_id"] == batch["recurrence_id"] for item in batch["sessions"])

    # Xem lại đúng khung giờ đó: lần này HLV đã bận.
    again = ok(admin.post("/classes/recurrence/preview", payload))
    assert again["conflict_count"] == 6
    assert again["available_count"] == 0
    assert all(item["conflict"] for item in again["occurrences"])

    # Tạo lẻ một buổi trùng giờ HLV cũng bị chặn, không phải 500.
    clash = batch["sessions"][0]
    fails(
        admin.post(
            "/classes",
            {
                "starts_at": clash["starts_at"],
                "ends_at": clash["ends_at"],
                "trainer_id": studio.trainer_ids["bao"],
                "class_type": ClassType.GROUP.value,
                "capacity": 4,
            },
        ),
        "TRAINER_DOUBLE_BOOKED",
    )

    # Đổi HLV của một lớp lẻ.
    moved = studio.session_ids["group_to_move"]
    changed = ok(admin.post(f"/classes/{moved}/trainer", {"trainer_id": studio.trainer_ids["mai"]}))
    assert changed["trainer_id"] == studio.trainer_ids["mai"]

    # Không có thao tác dời giờ; học viên đã đăng ký vẫn giữ lớp và gói cũ.
    lan = studio.students["lan"]
    booking = created(lan.post("/bookings", {"class_session_id": moved}))
    assert_ledger_is_sound(db)
    assert admin.post(f"/classes/{moved}/reschedule", {}).status_code == 404

    # Studio hủy lớp → hoàn cho mọi người, bất kể còn bao lâu tới giờ học.
    cancelled = ok(admin.post(f"/classes/{moved}/cancel", {"reason": "HLV báo nghỉ đột xuất"}))
    assert cancelled["refunded_booking_ids"] == [booking["booking"]["id"]]
    assert student_credits(studio, "lan") == 20
    assert_ledger_is_sound(db)

    fails(lan.post("/bookings", {"class_session_id": moved}), "SESSION_CANCELLED")
    fails(
        admin.post(f"/classes/{moved}/cancel", {"reason": "Bấm nhầm lần hai"}),
        "SESSION_ALREADY_CANCELLED",
    )


# --- 5. Tiền và sổ buổi -------------------------------------------------------


def test_dong_tien_di_qua_du_ba_trang_thai_va_so_buoi_van_can(studio: Studio, db: Session) -> None:
    admin = studio.admin

    # Xác nhận khoản chuyển khoản còn treo của Minh.
    confirmed = ok(admin.post(f"/payments/{studio.payment_ids['minh']}/confirm"))
    assert confirmed["status"] == "CONFIRMED"
    assert confirmed["confirmed_by"] == admin.user_id
    # Xác nhận lần hai là thao tác lặp vô hại, không phải lỗi.
    assert ok(admin.post(f"/payments/{studio.payment_ids['minh']}/confirm"))["status"] == (
        "CONFIRMED"
    )

    # Giao dịch đã huỷ là trạng thái cuối.
    fails(admin.post(f"/payments/{studio.payment_ids['yen']}/confirm"), "PAYMENT_VOIDED")
    fails(
        admin.post(f"/payments/{studio.payment_ids['yen']}/void", {"reason": "Huỷ lần hai"}),
        "PAYMENT_ALREADY_VOID",
    )

    # Gói đã tiêu buổi thì không huỷ giao dịch được — phải xử lý bằng tay.
    created(
        studio.students["lan"].post(
            "/bookings", {"class_session_id": studio.session_ids["group_tomorrow"]}
        )
    )
    assert_ledger_is_sound(db)
    fails(
        admin.post(f"/payments/{studio.payment_ids['lan']}/void", {"reason": "Khách đòi trả gói"}),
        "PACKAGE_HAS_CONSUMED_CREDITS",
    )
    assert_ledger_is_sound(db)

    # Gia hạn gói sắp hết hạn của Phương.
    renewed = ok(
        admin.post(
            f"/packages/{studio.package_ids['phuong']}/renew",
            {"extra_days": 30, "extra_credits": 5, "note": "Khách gia hạn tại quầy"},
        )
    )
    assert renewed["balance_cached"] == 15
    assert renewed["end_date"] == (today() + timedelta(days=40)).isoformat()
    assert_ledger_is_sound(db)

    # Sổ buổi đọc xuôi phải cộng ra đúng số dư cuối.
    ledger = ok(admin.get(f"/packages/{studio.package_ids['phuong']}/ledger"))
    assert [entry["reason_code"] for entry in ledger["entries"]] == [
        "PACKAGE_SOLD",
        "PACKAGE_RENEWED",
    ]
    assert sum(entry["delta"] for entry in ledger["entries"]) == ledger["closing_balance"]
    assert ledger["entries"][-1]["balance_after"] == 15

    # Điều chỉnh tay bắt buộc có lý do đủ dài — chặn ngay ở schema.
    too_short = admin.post(
        f"/packages/{studio.package_ids['huy']}/adjust", {"delta": 1, "reason": "x"}
    )
    assert too_short.status_code == 422, too_short.text
    adjusted = ok(
        admin.post(
            f"/packages/{studio.package_ids['huy']}/adjust",
            {"delta": 3, "reason": "Bù 3 buổi do studio mất điện tuần trước"},
        )
    )
    assert adjusted["balance_cached"] == 5
    assert_ledger_is_sound(db)

    revenue = ok(admin.get("/reports/revenue"))
    assert Decimal(revenue["total"]) == Decimal("17500000.00"), (
        "Lan 4.5tr + Minh 2.5tr (vừa xác nhận) + Trang 3tr + Huy 2.5tr "
        "+ Phương 2.5tr + Ngân 2.5tr; Yến bị VOID nên không vào doanh thu."
    )
    assert revenue["payment_count"] == 6
    by_method = {row["method"]: row["total"] for row in revenue["by_method"]}
    assert Decimal(by_method["TRANSFER"]) == Decimal("2500000.00"), (
        "Chỉ khoản của Minh; khoản chuyển khoản của Yến đã bị huỷ."
    )


# --- 6. Nhắc gia hạn ----------------------------------------------------------


def test_danh_sach_nhac_gia_han_noi_ro_ly_do_cua_tung_nguoi(studio: Studio) -> None:
    admin = studio.admin

    candidates = {row["student_id"]: row for row in ok(admin.get("/renewals"))}
    huy = candidates[studio.student_ids["huy"]]
    phuong = candidates[studio.student_ids["phuong"]]
    trang = candidates[studio.student_ids["trang"]]

    assert huy["reasons"] == ["LOW_CREDITS"]
    assert huy["credits_remaining"] == 2 <= RENEWAL_THRESHOLD["credits"]
    assert phuong["reasons"] == ["EXPIRING_SOON"]
    assert phuong["days_remaining"] == 10 <= RENEWAL_THRESHOLD["days"]
    assert trang["reasons"] == ["LOW_CREDITS"], (
        "Gói Private 5 buổi đã nằm dưới ngưỡng 6 buổi ngay từ lúc bán."
    )
    assert studio.student_ids["lan"] not in candidates, "Còn 20 buổi và còn 180 ngày."
    assert studio.student_ids["nam"] not in candidates, "Không có gói thì không nhắc gì."
    assert studio.student_ids["yen"] not in candidates, "Gói đã huỷ không phải gói cần gia hạn."

    summary = ok(admin.get("/renewals/summary"))
    assert summary["needing_contact"] == len(candidates) == 3
    assert (summary["low_credits"], summary["expiring_soon"]) == (2, 1)
    assert summary["never_contacted"] == 3

    contact = created(
        admin.post(
            "/renewals/contacts",
            {
                "student_id": studio.student_ids["huy"],
                "result": "Đã gọi, khách hẹn ghé cuối tuần",
                "next_contact_date": (today() + timedelta(days=3)).isoformat(),
            },
        )
    )
    assert contact["actor_user_id"] == admin.user_id

    after = {row["student_id"]: row for row in ok(admin.get("/renewals", contacted=True))}
    assert list(after) == [studio.student_ids["huy"]]
    assert after[studio.student_ids["huy"]]["last_contact_result"].startswith("Đã gọi")
    assert ok(admin.get("/renewals/summary"))["never_contacted"] == 2

    history = ok(admin.get(f"/renewals/students/{studio.student_ids['huy']}/contacts"))
    assert len(history) == 1


# --- 7. Báo cáo ---------------------------------------------------------------


def test_bao_cao_dem_dung_lop_dung_hlv_va_dung_tien(studio: Studio, db: Session) -> None:
    admin = studio.admin
    sessions = studio.session_ids

    def book(student_key: str, session_key: str) -> None:
        created(
            studio.students[student_key].post(
                "/bookings", {"class_session_id": sessions[session_key]}
            )
        )
        assert_ledger_is_sound(db)

    book("lan", "group_tomorrow")
    book("ngan", "group_tomorrow")
    book("minh", "group_to_cancel")
    ok(admin.post(f"/classes/{sessions['group_to_cancel']}/cancel", {"reason": "Sự cố điện"}))
    assert_ledger_is_sound(db)

    period = {
        "period_start": today().isoformat(),
        "period_end": (today() + timedelta(days=10)).isoformat(),
    }
    classes = ok(admin.get("/reports/classes", **period))
    assert classes["cancelled_sessions"] == 1
    assert classes["total_bookings"] == 2, "Lớp đã hủy không còn đăng ký nào giữ chỗ."
    assert 0 < classes["fill_rate"] <= 1

    trainers = {row["trainer_id"]: row for row in ok(admin.get("/reports/trainers", **period))}
    mai = trainers[studio.trainer_ids["mai"]]
    assert mai["trainer_name"] == "HLV Ngọc Mai"
    assert mai["cancelled_sessions"] == 1
    assert mai["total_bookings"] == 2

    sizes = {
        row["trainer_id"]: row for row in ok(admin.get("/reports/trainers/class-sizes", **period))
    }
    mai_sizes = sizes[studio.trainer_ids["mai"]]
    assert mai_sizes["size_2"] == 1, "Đúng một lớp có 2 người."
    assert mai_sizes["sessions_empty"] == mai_sizes["total_sessions"] - 1
    assert mai_sizes["total_sessions"] == mai["scheduled_sessions"], (
        "Hai màn hình cùng nguồn thì không được ra hai con số."
    )

    dashboard = ok(admin.get("/reports/dashboard"))
    numbers = {item["key"]: item["value"] for item in dashboard["numbers"]}
    assert set(numbers) == {
        "sessions_today",
        "bookings_today",
        "renewals_needing_contact",
        "unconfirmed_payments",
    }
    assert numbers["renewals_needing_contact"] == 3, "Huy, Trang và Phương."
    assert numbers["unconfirmed_payments"] == 0, (
        "Ô này chỉ đếm khoản treo **quá 7 ngày**; khoản của Minh vừa ghi hôm nay."
    )

    # Hạ ngưỡng xuống 0 ngày thì đúng khoản đó hiện ra — cùng một truy vấn,
    # khác mỗi tham số, nên hai màn hình không thể nói ngược nhau.
    treo = ok(admin.get("/reports/unconfirmed-payments", older_than_days=0))
    assert [row["payment_id"] for row in treo] == [studio.payment_ids["minh"]]
    assert treo[0]["days_pending"] == 0

    csv_export = admin.get("/reports/trainers/export", format="csv", **period)
    assert csv_export.status_code == 200
    assert "attachment" in csv_export.headers["content-disposition"]
    assert "HLV Ngọc Mai" in csv_export.text
    csv_rows = list(csv.DictReader(io.StringIO(csv_export.text.lstrip("\ufeff"))))
    csv_mai = next(row for row in csv_rows if row["Huấn luyện viên"] == "HLV Ngọc Mai")
    assert int(csv_mai["Số lớp"]) == mai["scheduled_sessions"]
    assert int(csv_mai["Lớp đã hủy"]) == mai["cancelled_sessions"]
    assert int(csv_mai["Lượt đăng ký"]) == mai["total_bookings"]

    xlsx_export = admin.get("/reports/trainers/class-sizes/export", format="xlsx", **period)
    assert xlsx_export.status_code == 200
    assert xlsx_export.content[:2] == b"PK", "File .xlsx là một ZIP."
    workbook = load_workbook(io.BytesIO(xlsx_export.content), read_only=True, data_only=True)
    rows = list(workbook.active.iter_rows(values_only=True))
    workbook.close()
    assert len(rows) == len(sizes) + 1
    exported_mai = next(row for row in rows[1:] if row[0] == "HLV Ngọc Mai")
    assert exported_mai[-1] == mai_sizes["total_sessions"]
    assert exported_mai[2] == mai_sizes["size_2"]
    assert exported_mai[-2] == mai_sizes["sessions_empty"]


# --- 8. Phân quyền trên chính dàn nhân vật này --------------------------------


def test_moi_vai_chi_cham_duoc_phan_cua_minh(studio: Studio) -> None:
    lan, huy = studio.students["lan"], studio.students["huy"]
    mai, bao = studio.trainers["mai"], studio.trainers["bao"]
    admin = studio.admin

    # Học viên: chỉ hồ sơ của mình.
    assert [row["id"] for row in ok(lan.get("/students"))] == [studio.student_ids["lan"]]
    fails(lan.get(f"/students/{studio.student_ids['huy']}"), "FORBIDDEN", status=403)
    # 404 chứ không phải 403 — cố ý: hai mã khác nhau cho "không có quyền" và
    # "không tồn tại" là một bộ đếm số gói của studio.
    fails(lan.get(f"/packages/{studio.package_ids['huy']}/ledger"), "NOT_FOUND", status=404)
    ok(lan.get(f"/packages/{studio.package_ids['lan']}/ledger"))

    # HLV: không xem dữ liệu học viên, không xem tiền.
    fails(mai.get(f"/students/{studio.student_ids['lan']}"), "FORBIDDEN", status=403)
    fails(mai.get("/payments"), "FORBIDDEN", status=403)
    fails(mai.get("/renewals"), "FORBIDDEN", status=403)
    fails(mai.get("/reports/revenue"), "FORBIDDEN", status=403)

    # HLV chỉ thấy lớp mình dạy.
    mai_sessions = {row["id"] for row in ok(mai.get("/classes"))}
    bao_sessions = {row["id"] for row in ok(bao.get("/classes"))}
    assert studio.session_ids["group_tomorrow"] in mai_sessions
    assert studio.session_ids["private_solo"] not in mai_sessions
    assert mai_sessions & bao_sessions == set()

    # Chỉ ADMIN/STAFF mở được lớp và bán được gói.
    fails(
        mai.post(
            "/classes",
            {
                "starts_at": (now() + timedelta(days=9)).isoformat(),
                "ends_at": (now() + timedelta(days=9, hours=1)).isoformat(),
                "trainer_id": studio.trainer_ids["mai"],
                "class_type": ClassType.GROUP.value,
                "capacity": 5,
            },
        ),
        "FORBIDDEN",
        status=403,
    )
    fails(
        lan.post(
            "/packages/sell",
            {
                "student_id": studio.student_ids["lan"],
                "package_type_id": studio.package_type_ids["group10"],
            },
        ),
        "FORBIDDEN",
        status=403,
    )

    # Chỉ ADMIN: tài khoản và điều chỉnh số buổi thủ công.
    fails(lan.get("/accounts"), "FORBIDDEN", status=403)
    fails(mai.get("/accounts"), "FORBIDDEN", status=403)
    fails(
        huy.post(
            f"/packages/{studio.package_ids['huy']}/adjust",
            {"delta": 10, "reason": "Tự cộng buổi cho mình"},
        ),
        "FORBIDDEN",
        status=403,
    )

    # Khoá tài khoản là cắt quyền ngay, không đợi token hết hạn.
    ok(admin.post(f"/accounts/{huy.user_id}/lock"))
    assert huy.get("/auth/me").status_code == 401
    ok(admin.post(f"/accounts/{huy.user_id}/unlock"))


# --- 9. Trang công khai -------------------------------------------------------


def test_trang_cong_khai_khong_lo_danh_tinh_va_khong_bia_gia(
    studio: Studio, client: TestClient
) -> None:
    trainers = ok(client.get("/public/trainers"))
    assert {row["full_name"] for row in trainers} == {"HLV Ngọc Mai", "HLV Thu Hà"}
    assert all(set(row) <= {"full_name", "photo_key", "bio"} for row in trainers)

    packages = ok(client.get("/public/packages"))
    by_name = {row["name"]: row for row in packages}
    assert "Gói thử 1 buổi" not in by_name, "Gói ngừng bán không lên trang."
    assert by_name["Gói 10 buổi Group"]["price"] == "2500000.00"
    assert by_name["Gói 8 buổi liên hệ giá"]["price"] is None, (
        "Chưa có giá thì để trống, không bịa ra số 0."
    )

    schedule = ok(client.get("/public/schedule", params={"days": 14}))
    assert schedule, "Lịch hai tuần tới phải có lớp."
    assert all(
        set(row) == {"starts_at", "ends_at", "class_type", "trainer_name", "is_full"}
        for row in schedule
    )

    announcements = ok(client.get("/public/announcements"))
    assert [row["title"] for row in announcements] == ["Ưu đãi tháng này"]
    assert all("body" in row for row in announcements)

    # Không token thì không có gì.
    assert client.get("/students").status_code == 401
    assert client.get("/reports/dashboard").status_code == 401


# --- 10. Ảnh tiến trình -------------------------------------------------------


def _photo() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), (210, 190, 170)).save(buffer, format="JPEG")
    return buffer.getvalue()


def test_anh_tien_trinh_chi_den_dung_nguoi_co_quyen(studio: Studio, db: Session) -> None:
    """ADMIN, chính học viên và các HLV đã hoặc đang dạy qua lượt chưa hủy."""
    lan_id = studio.student_ids["lan"]
    mai, bao = studio.trainers["mai"], studio.trainers["bao"]

    # Lan học lớp của HLV Mai → Mai là HLV phụ trách; Bảo thì không.
    created(
        studio.students["lan"].post(
            "/bookings", {"class_session_id": studio.session_ids["group_tomorrow"]}
        )
    )

    assert_ledger_is_sound(db)

    photo = created(
        studio.admin.upload(
            f"/students/{lan_id}/progress-photos",
            files={"file": ("tien-trinh.jpg", _photo(), "image/jpeg")},
        )
    )
    assert "storage_key" not in photo, "Khoá ảnh không bao giờ ra khỏi server."

    assert len(ok(mai.get(f"/students/{lan_id}/progress-photos"))) == 1
    assert len(ok(studio.students["lan"].get(f"/students/{lan_id}/progress-photos"))) == 1
    fails(bao.get(f"/students/{lan_id}/progress-photos"), "FORBIDDEN", status=403)
    fails(
        studio.students["huy"].get(f"/students/{lan_id}/progress-photos"),
        "FORBIDDEN",
        status=403,
    )

    file_response = studio.students["lan"].get(
        f"/students/{lan_id}/progress-photos/{photo['id']}/file"
    )
    assert file_response.status_code == 200
    assert file_response.headers["content-type"].startswith("image/")

    # Xoá ảnh là quyền của ADMIN.
    fails(mai.delete(f"/students/{lan_id}/progress-photos/{photo['id']}"), "FORBIDDEN", status=403)
    removed = studio.admin.delete(f"/students/{lan_id}/progress-photos/{photo['id']}")
    assert removed.status_code == 204
    assert ok(studio.admin.get(f"/students/{lan_id}/progress-photos")) == []


def test_hlv_diem_danh_sau_lop_va_hoc_vien_doc_dung_ket_qua(
    studio: Studio,
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session_id = studio.session_ids["group_tomorrow"]
    mai, bao = studio.trainers["mai"], studio.trainers["bao"]
    bookings = {}
    for key in ("lan", "minh"):
        bookings[key] = created(
            studio.students[key].post("/bookings", {"class_session_id": session_id})
        )["booking"]["id"]
        assert_ledger_is_sound(db)

    # "Lịch dạy của tôi" là đường riêng của vai HLV: lọc theo trainer_id của
    # chính người đăng nhập, không nhận tham số nào để giả mạo người khác.
    mai_schedule = {row["id"] for row in ok(mai.get("/classes/my-schedule"))}
    bao_schedule = {row["id"] for row in ok(bao.get("/classes/my-schedule"))}
    assert session_id in mai_schedule
    assert mai_schedule & bao_schedule == set()
    # Vai khác không có lịch dạy — kể cả admin, người thấy được mọi lớp.
    fails(studio.admin.get("/classes/my-schedule"), "FORBIDDEN", status=403)
    fails(studio.students["lan"].get("/classes/my-schedule"), "FORBIDDEN", status=403)

    roster = ok(mai.get(f"/classes/{session_id}/attendance"))
    assert {row["student_id"] for row in roster} == {
        studio.student_ids["lan"],
        studio.student_ids["minh"],
    }
    fails(bao.get(f"/classes/{session_id}/attendance"), "FORBIDDEN", status=403)
    fails(
        mai.patch(f"/bookings/{bookings['lan']}/attendance", {"status": "ATTENDED"}),
        "SESSION_NOT_FINISHED",
    )

    # Dịch đồng hồ sau ends_at; không sửa trực tiếp dữ liệu lớp/booking.
    class_detail = ok(studio.admin.get(f"/classes/{session_id}"))
    clock = studio_clock(datetime.fromisoformat(class_detail["ends_at"]) + timedelta(seconds=1))
    monkeypatch.setattr("app.services.attendance.now", clock)
    monkeypatch.setattr("app.api.my_schedule.now", clock)

    for key, status in (("lan", "ATTENDED"), ("minh", "NO_SHOW")):
        result = ok(mai.patch(f"/bookings/{bookings[key]}/attendance", {"status": status}))
        assert result["attendance_marked_by"] == mai.user_id
        assert result["attendance_marked_at"] is not None
        assert_ledger_is_sound(db)
        row = ok(studio.students[key].get("/my-schedule"))[0]
        assert row["booking_status"] == status
        assert row["can_cancel"] is False
        assert row["refund_if_cancelled_now"] is False

    assert student_credits(studio, "lan") == 19
    assert student_credits(studio, "minh") == 9
    fails(
        studio.students["minh"].post(f"/bookings/{bookings['minh']}/cancel"), "BOOKING_NOT_ACTIVE"
    )
    assert ok(studio.admin.get(f"/classes/{session_id}"))["booked_count"] == 2


# --- 11. Lễ tân: một ca trực đầy đủ và bốn cánh cửa đóng ----------------------


def _receptionist(studio: Studio, client: TestClient) -> ApiUser:
    """Lễ tân do chính admin cấp tài khoản — đúng đường studio sẽ đi thật.

    Dựng trong màn này thay vì trong `build_studio`: mười hai màn còn lại
    khẳng định "ADMIN làm được X", và thêm một nhân vật vào sân khấu chung sẽ
    đổi số đếm của chúng mà không màn nào nói về lễ tân cả.
    """
    account = created(
        studio.admin.post(
            "/accounts",
            {
                "email": "letan.thao@example.com",
                "full_name": "Lễ tân Thảo",
                "phone": "0912000010",
                "role": Role.STAFF.value,
                "password": TEST_PASSWORD,
            },
        )
    )
    tokens = login(client, "letan.thao@example.com")
    return ApiUser(
        client=client,
        token=tokens["access_token"],
        user_id=account["id"],
        label="le-tan",
    )


def test_le_tan_lam_tron_ca_truc_nhung_khong_cham_duoc_bon_thu(
    studio: Studio, client: TestClient, db: Session
) -> None:
    """Vai STAFF: làm được cả ngày vận hành, và dừng đúng ở bốn ranh giới.

    Nửa dưới quan trọng hơn nửa trên. Lễ tân là vai **đông người dùng nhất và
    luân chuyển nhiều nhất** trong một studio; nếu quyền của nó rộng bằng
    ADMIN thì bốn thứ nguy hiểm nhất — ảnh cơ thể học viên, số buổi, tài
    khoản, và đặt lớp hộ — đều nằm trong tay người trực quầy.
    """
    staff = _receptionist(studio, client)
    admin = studio.admin

    # --- Nửa trên: một ca trực bình thường, tất cả bằng tài khoản lễ tân ---

    # Khách gọi điện đăng ký học → lễ tân mở hồ sơ.
    khanh = created(
        staff.post(
            "/students",
            {"full_name": "Đỗ Minh Khánh", "phone": "0901000011", "email": "khanh@example.com"},
        )
    )

    # Bán gói, thu tiền mặt, xác nhận ngay tại quầy.
    package = created(
        staff.post(
            "/packages/sell",
            {
                "student_id": khanh["id"],
                "package_type_id": studio.package_type_ids["group10"],
            },
        )
    )
    assert package["balance_cached"] == 10
    payment = created(
        staff.post(
            "/payments",
            {"student_package_id": package["id"], "amount": "2500000", "method": "CASH"},
        )
    )
    assert ok(staff.post(f"/payments/{payment['id']}/confirm"))["status"] == "CONFIRMED"
    assert_ledger_is_sound(db)

    # Khách quen tới gia hạn.
    renewed = ok(
        staff.post(
            f"/packages/{package['id']}/renew",
            {"extra_days": 30, "extra_credits": 5, "note": "Khách gia hạn tại quầy"},
        )
    )
    assert renewed["balance_cached"] == 15
    assert_ledger_is_sound(db)

    # Khách để lại số trên web → lễ tân chuyển thành hồ sơ học viên.
    assert (
        client.post(
            "/public/leads",
            json={"full_name": "Vũ Hà My", "phone": "0901000012", "need": "Tập sau sinh"},
        ).status_code
        == 201
    )
    lead = ok(staff.get("/leads", q="0901000012"))[0]
    assert created(staff.post(f"/leads/{lead['id']}/convert"))["full_name"] == "Vũ Hà My"

    # Xếp lịch: mở lớp, đổi HLV, rồi hủy vì HLV báo nghỉ.
    starts_at = now() + timedelta(days=11)
    session = created(
        staff.post(
            "/classes",
            {
                "starts_at": starts_at.isoformat(),
                "ends_at": (starts_at + timedelta(hours=1)).isoformat(),
                "trainer_id": studio.trainer_ids["ha"],
                "class_type": ClassType.GROUP.value,
                "capacity": 5,
            },
        )
    )
    changed = ok(
        staff.post(f"/classes/{session['id']}/trainer", {"trainer_id": studio.trainer_ids["mai"]})
    )
    assert changed["trainer_id"] == studio.trainer_ids["mai"]
    ok(staff.post(f"/classes/{session['id']}/cancel", {"reason": "HLV báo nghỉ đột xuất"}))

    # Thêm một HLV mới vào danh sách.
    assert created(
        staff.post(
            "/trainers",
            {
                "full_name": "HLV Bảo Trâm",
                "phone": "0911000004",
                "bio": "Bảo Trâm dạy tại studio từ 2021.",
                "specialties": "Mat Pilates",
                "is_public": True,
            },
        )
    )["is_public"]

    # Khách đổi số điện thoại → sửa hồ sơ đã có.
    khanh_moi = ok(
        staff.patch(
            f"/students/{khanh['id']}",
            {"phone": "0901000013", "note": "Khách đổi số, đã xác nhận qua Zalo"},
        )
    )
    assert khanh_moi["phone"] == "0901000013"

    # Studio ra gói mới và ngừng bán một gói cũ — danh mục là việc của quầy.
    loai_goi = created(
        staff.post(
            "/package-types",
            {
                "name": "Group 8 buổi",
                "price": "2000000",
                "credits": 8,
                "duration_days": 60,
                "class_type": ClassType.GROUP.value,
            },
        )
    )
    ok(staff.patch(f"/package-types/{loai_goi['id']}", {"is_selling": False}))
    # Ngừng bán là rút khỏi bảng giá công khai, không phải xoá: gói đã bán theo
    # loại này vẫn phải tra lại được.
    assert loai_goi["name"] not in {row["name"] for row in ok(client.get("/public/packages"))}

    # Đăng thông báo khuyến mãi, rồi sửa lại giờ khai giảng.
    thong_bao = created(
        staff.post(
            "/announcements",
            {
                "title": "Khung sáng lớp Reformer",
                "body": "Studio mở thêm khung sáng từ tuần sau.",
                "is_published": True,
            },
        )
    )
    sua = ok(
        staff.patch(
            f"/announcements/{thong_bao['id']}",
            {"body": "Studio mở thêm khung sáng từ đầu tháng."},
        )
    )
    assert sua["updated_by"] == staff.user_id
    # Nội dung sửa vẫn phải qua bộ lọc trang công khai — không có đường vòng
    # "đăng sạch rồi sửa thành câu bị cấm".
    vi_pham = staff.patch(
        f"/announcements/{thong_bao['id']}", {"body": "Lớp tối đa 3 người mỗi buổi"}
    )
    assert vi_pham.status_code == 422, vi_pham.text
    assert ok(client.get("/public/announcements"))[0]["body"] == sua["body"]

    # Theo dõi vận hành: đăng ký, nhắc gia hạn, báo cáo.
    ok(staff.get("/bookings"))
    assert ok(staff.get("/renewals/summary"))["needing_contact"] >= 1
    contact = created(
        staff.post(
            "/renewals/contacts",
            {"student_id": studio.student_ids["huy"], "result": "Đã gọi, khách hẹn ghé"},
        )
    )
    # Lịch sử liên hệ ghi đúng tên người gọi, không gộp về admin.
    assert contact["actor_user_id"] == staff.user_id
    stats = ok(
        staff.get(
            "/classes/trainer-stats",
            trainer_id=studio.trainer_ids["mai"],
            year=today().year,
            month=today().month,
        )
    )
    # Thống kê tháng của HLV là màn của nhân viên, không phải của chính HLV.
    assert stats["trainer_id"] == studio.trainer_ids["mai"]
    assert stats["scheduled_sessions"] >= 1
    fails(studio.trainers["mai"].get(
        "/classes/trainer-stats",
        trainer_id=studio.trainer_ids["mai"],
        year=today().year,
        month=today().month,
    ), "FORBIDDEN", status=403)
    ok(staff.get("/reports/dashboard"))
    ok(staff.get("/reports/revenue"))
    # File xuất là CSV, không phải JSON — đọc thân response, không gọi .json().
    export = staff.get("/reports/trainers/export", format="csv")
    assert export.status_code == 200, export.text
    assert export.text.splitlines()[0]

    # --- Nửa dưới: bốn cánh cửa đóng, mỗi cánh một lý do khác nhau ---

    lan_id = studio.student_ids["lan"]

    # 1. Ảnh tiến trình — ảnh cơ thể học viên không phải dữ liệu vận hành quầy.
    fails(staff.get(f"/students/{lan_id}/progress-photos"), "FORBIDDEN", status=403)

    # 2. Điều chỉnh số buổi thủ công — chỉ ADMIN, vì nó tạo buổi từ hư không.
    fails(
        staff.post(
            f"/packages/{studio.package_ids['lan']}/adjust",
            {"delta": 5, "reason": "Bù buổi cho khách quen"},
        ),
        "FORBIDDEN",
        status=403,
    )

    # 3. Quản lý tài khoản — lễ tân không tự cấp quyền cho mình hay cho ai.
    fails(staff.get("/accounts"), "FORBIDDEN", status=403)

    # 4. Đặt lớp hộ học viên — chỉ học viên tự đặt cho mình, kể cả khi đứng quầy.
    fails(
        staff.post(
            "/bookings",
            {
                "class_session_id": studio.session_ids["group_tomorrow"],
                "student_id": lan_id,
            },
        ),
        "FORBIDDEN",
        status=403,
    )

    # Và điểm danh là việc của HLV đứng lớp, không phải của quầy.
    fails(
        staff.get(f"/classes/{studio.session_ids['group_tomorrow']}/attendance"),
        "FORBIDDEN",
        status=403,
    )

    # Và chiều ngược lại: việc của quầy không mở cho học viên hay HLV.
    for outsider in (studio.students["lan"], studio.trainers["mai"]):
        fails(
            outsider.post(
                "/trainers",
                {"full_name": "HLV Tự Phong", "phone": "0911000009", "is_public": True},
            ),
            "FORBIDDEN",
            status=403,
        )
        fails(outsider.get("/leads"), "FORBIDDEN", status=403)

    # Sổ buổi vẫn cân sau trọn một ca trực của lễ tân.
    assert_ledger_is_sound(db)

    # Admin vẫn làm được đúng thứ lễ tân vừa bị từ chối — bốn mã 403 ở trên là
    # ranh giới phân quyền, không phải một tính năng hỏng.
    ok(admin.get(f"/students/{lan_id}/progress-photos"))
    ok(admin.get("/accounts"))
