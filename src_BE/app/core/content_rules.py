"""Quy tắc nội dung P3 — nguồn chung cho validator phía server và cổng CI.

Vì sao phải có validator khi ghi, chứ grep bundle là chưa đủ: nội dung công
khai thật nằm trong CSDL (`announcement.body`, `trainer.bio`, `specialties`,
`trainer.full_name`) do nhân viên studio nhập **sau khi go-live**. Grep bundle
chỉ chứng minh lập trình viên không gõ chuỗi cấm — nó mù hoàn toàn với dòng
bio mà lễ tân điền vào tuần nhập liệu.

Nguyên tắc chung: cấm **khẳng định về studio mà chưa ai cung cấp**. Không cấm
sự kiện có thật — một buổi lớp đã được xếp vào 18:00–19:00 là sự thật và được
phép hiện; "giờ mở cửa 7:30–19:30" là một lời hứa chưa ai xác nhận.
"""

from __future__ import annotations

import html
import re
import unicodedata
from dataclasses import dataclass

import nh3

from app.core.errors import ValidationError


@dataclass(frozen=True)
class ContentRule:
    code: str
    #: Câu giải thích trả về trong 422 — nhân viên phải biết mình vướng luật nào.
    label: str
    pattern: re.Pattern[str]


def _rule(code: str, label: str, expr: str) -> ContentRule:
    return ContentRule(code, label, re.compile(expr, re.IGNORECASE | re.UNICODE))


#: Áp cho mọi trường đăng công khai do người dùng nhập.
PUBLIC_CONTENT_RULES: tuple[ContentRule, ...] = (
    _rule(
        "P3_CERTIFICATE",
        "Không đăng chứng chỉ, bằng cấp hay chứng nhận của HLV lên trang công "
        "khai cho tới khi studio cung cấp dữ liệu thật.",
        r"chứng\s*chỉ|chứng\s*nhận|bằng\s*cấp|văn\s*bằng|certificate|certified|diploma",
    ),
    _rule(
        "P3_EXPERIENCE_YEARS",
        "Không đăng số năm kinh nghiệm của HLV lên trang công khai.",
        r"năm\s+kinh\s*nghiệm|\d+\s*\+?\s*năm\s+(?:trong\s+nghề|làm\s+nghề)",
    ),
    _rule(
        "P3_CLASS_SIZE_CLAIM",
        "Không công bố sức chứa lớp dạng 'tối đa N người' — con số này chưa "
        "được studio xác nhận.",
        r"tối\s*đa\s*\d+\s*(?:người|khách|học\s*viên)",
    ),
    _rule(
        "P3_OPENING_HOURS",
        "Không công bố giờ mở cửa — studio chưa cung cấp thông tin này. Lịch "
        "các buổi lớp đã xếp thì vẫn được hiện.",
        r"giờ\s*mở\s*cửa|mở\s*cửa\s*từ|giờ\s*hoạt\s*động|giờ\s*làm\s*việc",
    ),
    _rule(
        "P3_BUSINESS_METRICS",
        "Không đăng số liệu kinh doanh (doanh thu, tăng trưởng, tổng số học "
        "viên) lên trang công khai.",
        r"doanh\s*thu|tăng\s*trưởng|tổng\s*(?:số\s*)?học\s*viên"
        r"|(?:hơn|trên)\s*\d+\s*học\s*viên|\d+\s*\+\s*học\s*viên",
    ),
)

#: Tên dùng trong dữ liệu mẫu. Một tên Việt trông như thật trong fixture sẽ bị
#: đọc là học viên có thật của studio.
DEMO_NAME_TEMPLATE = "Học viên Demo {index:02d}"

#: Ký tự không chiếm chỗ nhưng cắt đôi được một từ: zero-width space/non-joiner/
#: joiner, soft hyphen, word joiner, BOM. Người đọc thấy "Chứng chỉ", regex thấy
#: hai mảnh rời.
_INVISIBLE_CHARS = re.compile(r"[\u200b-\u200d\u00ad\u2060\ufeff]")


def _as_reader_sees_it(value: str) -> str:
    """Đưa chuỗi về đúng thứ người đọc trang công khai nhìn thấy.

    Luật P3 nói về **điều được khẳng định với khách**, nên phải đối chiếu trên
    dạng hiển thị chứ không phải dạng lưu trữ. Ba phép biến đổi, mỗi phép ứng
    với một đường vòng đã tái hiện được:

    - **Bóc thẻ.** `Lớp tối đa <strong>3</strong> người` hiển thị nguyên câu bị
      cấm, nhưng regex chạy trên chuỗi có thẻ thì không thấy gì.
    - **Giải mã thực thể + chuẩn hoá NFC.** `&nbsp;` và tổ hợp NFD
      (`Chứng` viết bằng `C-h-u-˘-...`) trông giống hệt bản thường.
    - **Xoá ký tự vô hình.** `Chứng​chỉ` đọc lên không khác gì `Chứng chỉ`.
    """
    plain = nh3.clean(value, tags=set(), attributes={})
    plain = html.unescape(plain)
    plain = unicodedata.normalize("NFC", plain)
    return _INVISIBLE_CHARS.sub("", plain)


def find_violations(value: str | None) -> list[ContentRule]:
    """Luật P3 nào bị vi phạm. Luôn đối chiếu trên dạng người đọc nhìn thấy."""
    if not value:
        return []
    comparable = _as_reader_sees_it(value)
    return [rule for rule in PUBLIC_CONTENT_RULES if rule.pattern.search(comparable)]


def assert_public_content_clean(value: str | None, field: str) -> None:
    """Chặn nội dung vi phạm P3 ngay lúc ghi, nêu rõ luật bị vi phạm."""
    violations = find_violations(value)
    if violations:
        raise ValidationError(
            f"Trường '{field}' vi phạm quy tắc nội dung công khai: "
            + " ".join(rule.label for rule in violations),
            code=violations[0].code,
        )


# --- Làm sạch và giới hạn đầu vào -------------------------------------------
#
# Đường XSS lưu trữ ngắn nhất của hệ: khách ẩn danh gửi form tư vấn → nhân viên
# mở danh sách lead → token bị đánh cắp. Mọi trường văn bản tự do phải qua đây.

_ALLOWED_TAGS = {"p", "br", "strong", "em", "ul", "ol", "li", "a"}
_ALLOWED_ATTRS = {"a": {"href", "title"}}


def sanitize_plain_text(value: str | None, max_length: int, field: str) -> str | None:
    """Bóc toàn bộ thẻ, trả về **văn bản thuần**. Dùng cho trường không cần markup.

    Giải mã thực thể sau khi bóc thẻ là phần bắt buộc, không phải tuỳ chọn:
    `nh3` escape `&` và `<` kể cả khi đã bóc sạch thẻ, nên không giải mã thì
    `Reformer & Mat` được **lưu** thành `Reformer &amp; Mat` và khách đọc đúng
    chuỗi đó. Tệ hơn, mỗi lần sửa lại escape thêm một lớp: `&amp;amp;`.

    An toàn vì giá trị trả về là văn bản thuần theo hợp đồng — nơi hiển thị
    chịu trách nhiệm mã hoá khi render, và trường này không bao giờ được render
    dưới dạng HTML.
    """
    if value is None:
        return None
    cleaned = html.unescape(nh3.clean(value, tags=set(), attributes={})).strip()
    if len(cleaned) > max_length:
        raise ValidationError(f"Trường '{field}' vượt quá {max_length} ký tự.")
    return cleaned


def sanitize_rich_text(value: str, max_length: int, field: str) -> str:
    """Giữ một tập markup hạn chế theo whitelist. Dùng cho `announcement.body`.

    Cố ý **không** giải mã thực thể: kết quả ở đây là HTML và sẽ được render
    như HTML, nên thực thể phải giữ nguyên.
    """
    cleaned = nh3.clean(
        value, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, link_rel="noopener noreferrer"
    ).strip()
    if len(cleaned) > max_length:
        raise ValidationError(f"Trường '{field}' vượt quá {max_length} ký tự.")
    return cleaned


def clean_public_text(
    value: str | None,
    *,
    field: str,
    max_length: int,
    rich: bool = False,
    allow_empty: bool = True,
) -> str | None:
    """Làm sạch **và** kiểm quy tắc P3 cho một trường đăng công khai.

    Gộp hai bước vào một lời gọi có chủ ý: làm sạch mà quên kiểm P3 thì nội
    dung bịa vẫn lên trang, kiểm P3 mà quên làm sạch thì mã vẫn chạy trên máy
    nhân viên. Mọi trường đi ra trang công khai đi qua đúng hàm này.

    `allow_empty=False` cho trường NOT NULL: `<script>alert(1)</script>` qua
    `min_length=1` của Pydantic vì chuỗi gốc không rỗng, nhưng làm sạch xong
    thì không còn gì — và ghi `None` vào cột NOT NULL biến một đầu vào đáng
    422 thành 500.
    """
    if value is None:
        cleaned = None
    else:
        cleaned = (
            sanitize_rich_text(value, max_length, field)
            if rich
            else sanitize_plain_text(value, max_length, field)
        ) or None

    if cleaned is None:
        if not allow_empty:
            raise ValidationError(
                f"Trường '{field}' không còn nội dung nào sau khi làm sạch.",
                code="EMPTY_AFTER_SANITIZE",
            )
        return None

    assert_public_content_clean(cleaned, field)
    return cleaned
