"""Trung hoà công thức khi xuất file.

Đường tấn công đầy đủ, không cần tài khoản nào: một người lạ gõ
`=cmd|'/c calc'!A1` vào ô "nhu cầu" của form tư vấn **công khai**; nhân viên
mở file xuất trên máy studio; bảng tính hỏi một câu và người đang vội bấm Yes.

Văn bản do người ngoài nhập có mặt ở khắp các báo cáo — tên học viên, ghi chú,
`trainer.bio`, `lead.need` — nên phép trung hoà phải nằm ở **tầng xuất file**,
không phải ở từng chỗ gọi.
"""

from __future__ import annotations

import io

import pytest
from openpyxl import load_workbook

from app.services.export import FORMULA_TRIGGERS, neutralize, to_csv, to_xlsx

PAYLOADS = [
    "=cmd|'/c calc'!A1",
    "+1+1",
    "-2+3",
    "@SUM(1,1)",
    "\t=1+1",
    "\r=1+1",
]


@pytest.mark.parametrize("payload", PAYLOADS)
def test_every_formula_trigger_is_neutralised(payload: str) -> None:
    result = neutralize(payload)
    assert result.startswith("'")
    assert result[1:] == payload


def test_ordinary_text_is_left_alone() -> None:
    """Trung hoà không được đụng vào dữ liệu bình thường.

    Thêm dấu nháy vào mọi ô thì tên học viên nào cũng mở ra kèm một ký tự lạ,
    và người dùng sẽ kết luận file xuất bị hỏng.
    """
    for value in ["Nguyễn Thị Lan", "0900000001", "Gói 10 buổi", "Phòng 2 (tầng 1)"]:
        assert neutralize(value) == value


def test_numbers_keep_their_type() -> None:
    """Cột số phải cộng được trong bảng tính, nên không được thành chuỗi."""
    assert neutralize(12) == 12
    assert neutralize(None) is None
    assert neutralize(3.5) == 3.5


def test_csv_export_neutralises_a_hostile_row() -> None:
    content = to_csv(
        ["Huấn luyện viên", "Số lớp"],
        [["=HYPERLINK(\"http://evil\",\"Bấm vào đây\")", 12]],
    )
    assert "'=HYPERLINK" in content
    assert not any(
        line.startswith(("=", "+", "@")) for line in content.splitlines() if line
    )
    # Cột số vẫn là số.
    assert ",12" in content


def test_csv_starts_with_a_bom() -> None:
    """Thiếu BOM thì Excel trên Windows đọc sai mọi tên tiếng Việt có dấu."""
    assert to_csv(["Tên"], [["Nguyễn Văn A"]]).startswith("﻿")


def test_xlsx_export_stores_formulas_as_text() -> None:
    """`.xlsx` không miễn nhiễm: openpyxl vẫn ghi ô bắt đầu bằng `=` thành công
    thức nếu để nguyên."""
    payload = "=1+1"
    workbook = load_workbook(io.BytesIO(to_xlsx(["Ghi chú"], [[payload]])))
    cell = workbook.active["A2"]

    assert cell.value == "'" + payload
    assert cell.data_type == "s"


def test_header_row_is_neutralised_too() -> None:
    """Tiêu đề cột cũng có thể đến từ dữ liệu — ví dụ tên gói làm tên cột."""
    content = to_csv(["=Gói", "Số lớp"], [["HLV Mai", 3]])
    assert content.splitlines()[0].startswith("﻿'=Gói") or "'=Gói" in content


def test_trigger_list_covers_the_documented_characters() -> None:
    """Danh sách ký tự kích hoạt là hợp đồng, không phải chi tiết nội bộ.

    Bớt một ký tự khỏi đây là mở lại đúng lỗ này, nên nó được ghim bằng test.
    """
    assert set(FORMULA_TRIGGERS) == {"=", "+", "-", "@", "\t", "\r"}
