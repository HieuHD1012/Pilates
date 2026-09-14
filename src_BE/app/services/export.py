"""Xuất dữ liệu ra CSV/Excel.

**Trung hoà công thức là bắt buộc, không phải tuỳ chọn.** Các dòng xuất chứa
văn bản do người ngoài nhập: `student.full_name`, `student.note`, `trainer.bio`,
và đặc biệt `lead.need` — đến thẳng từ form tư vấn **công khai, ẩn danh**.

Đường tấn công đầy đủ: một người lạ gõ `=cmd|'/c calc'!A1` vào ô "nhu cầu" trên
website; nhân viên mở file xuất trên máy studio; Excel hỏi một câu và người
đang vội bấm Yes. Không ai cần đăng nhập vào đâu cả. Chặn thì rẻ, bỏ sót thì
đắt.

Cả hai định dạng dùng **đúng dữ liệu của màn hình**: hàm ở đây nhận kết quả đã
tính từ `report_queries`, không tự truy vấn lại. Viết truy vấn thứ hai là cách
file xuất và màn hình lệch nhau mà không ai phát hiện cho tới lúc khách đối
chiếu.
"""

from __future__ import annotations

import csv
import io
from collections.abc import Iterable, Sequence
from datetime import datetime

from openpyxl import Workbook

from app.domain.rules import TIMEZONE

#: Ký tự mở đầu bị Excel/LibreOffice/Google Sheets hiểu là **công thức**.
#: Tab và CR nằm trong danh sách vì chúng bị cắt bỏ khi đọc ô, để lộ ký tự
#: đứng ngay sau — `\t=cmd...` trở lại thành `=cmd...`.
FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")


def neutralize(value: object) -> object:
    """Làm một ô trở thành văn bản thuần trong mắt phần mềm bảng tính.

    Thêm dấu nháy đơn đứng trước. Excel và Google Sheets coi nháy đầu là dấu
    "ô này là văn bản" và **không hiển thị nó**; công cụ đọc file bằng thư viện
    thì thấy nguyên ký tự đó trong giá trị. Đánh đổi có chủ ý: ký tự thừa đi
    theo dữ liệu ở mọi nơi, đổi lại không phụ thuộc vào phần mềm nào tôn trọng
    thuộc tính định dạng.

    Chỉ chạm chuỗi — số, ngày và `None` giữ nguyên kiểu để cột số vẫn cộng được.
    """
    if not isinstance(value, str):
        return value
    if value.startswith(FORMULA_TRIGGERS):
        return "'" + value
    return value


def _render(value: object) -> object:
    if isinstance(value, datetime):
        return value.astimezone(TIMEZONE).strftime("%Y-%m-%d %H:%M")
    return neutralize(value)


def to_csv(headers: Sequence[str], rows: Iterable[Sequence[object]]) -> str:
    """CSV UTF-8 kèm BOM.

    BOM là thứ duy nhất khiến Excel trên Windows đọc đúng tiếng Việt có dấu;
    thiếu nó thì mọi tên học viên mở ra thành ký tự lạ và người dùng kết luận
    hệ thống hỏng.
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([neutralize(header) for header in headers])
    for row in rows:
        writer.writerow([_render(cell) for cell in row])
    return "﻿" + buffer.getvalue()


def to_xlsx(
    headers: Sequence[str], rows: Iterable[Sequence[object]], sheet_title: str = "Báo cáo"
) -> bytes:
    """Excel với **mọi ô văn bản ở dạng text**.

    Trung hoà vẫn áp ở đây dù `.xlsx` an toàn hơn CSV: một ô bắt đầu bằng `=`
    vẫn được openpyxl ghi thành công thức nếu để nguyên.
    """
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title[:31]
    sheet.append([neutralize(header) for header in headers])
    for row in rows:
        sheet.append([_render(cell) for cell in row])

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
