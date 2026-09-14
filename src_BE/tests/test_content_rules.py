"""Quy tắc nội dung P3 và làm sạch đầu vào (F00).

Cổng CI grep bundle chỉ chứng minh lập trình viên không gõ chuỗi cấm. Nội dung
công khai thật do nhân viên studio nhập sau go-live, nên lớp chặn có tác dụng
là validator ở đây.
"""

from __future__ import annotations

import pytest

from app.core.content_rules import (
    assert_public_content_clean,
    find_violations,
    sanitize_plain_text,
    sanitize_rich_text,
)
from app.core.errors import ValidationError


@pytest.mark.parametrize(
    ("text", "expected_code"),
    [
        ("Chứng chỉ Polestar Pilates", "P3_CERTIFICATE"),
        ("HLV có bằng cấp quốc tế", "P3_CERTIFICATE"),
        ("8 năm kinh nghiệm giảng dạy", "P3_EXPERIENCE_YEARS"),
        ("Lớp tối đa 3 người mỗi buổi", "P3_CLASS_SIZE_CLAIM"),
        ("Giờ mở cửa 7:30 - 19:30", "P3_OPENING_HOURS"),
        ("Studio mở cửa từ sáng sớm", "P3_OPENING_HOURS"),
        ("Doanh thu tháng này tăng mạnh", "P3_BUSINESS_METRICS"),
        ("Hơn 500 học viên đã tin tưởng", "P3_BUSINESS_METRICS"),
    ],
)
def test_forbidden_content_is_rejected(text: str, expected_code: str) -> None:
    violations = find_violations(text)
    assert expected_code in [rule.code for rule in violations], text

    with pytest.raises(ValidationError) as exc:
        assert_public_content_clean(text, "bio")
    # 422 phải nêu rõ luật bị vi phạm, không chỉ nói "không hợp lệ".
    assert exc.value.status_code == 422
    assert "bio" in exc.value.message


@pytest.mark.parametrize(
    "text",
    [
        "Buổi Group thứ Ba 18:00 - 19:00 còn chỗ.",
        "Lớp Private dành cho người mới bắt đầu.",
        "Khuyến mãi: giảm 20% cho gói 10 buổi.",
        "Giá gói 10 buổi: 2.500.000đ.",
    ],
)
def test_legitimate_content_is_allowed(text: str) -> None:
    """Sự kiện có thật và giá do studio công bố thì được hiện.

    Một buổi lớp đã xếp vào 18:00–19:00 là sự thật; "giờ mở cửa 7:30–19:30"
    là lời hứa chưa ai xác nhận. Phân biệt này phải giữ được, nếu không cổng
    sẽ chặn đúng thứ nó phải cho qua.
    """
    assert find_violations(text) == []
    assert_public_content_clean(text, "body")


def test_sanitize_strips_script_from_lead_field() -> None:
    """Đường XSS lưu trữ ngắn nhất: khách ẩn danh → form tư vấn → máy nhân viên."""
    dirty = '<script>fetch("/steal?t="+localStorage.token)</script>Muốn tập buổi tối'
    assert sanitize_plain_text(dirty, 500, "need") == "Muốn tập buổi tối"


def test_sanitize_rejects_over_length() -> None:
    with pytest.raises(ValidationError):
        sanitize_plain_text("x" * 501, 500, "need")


def test_rich_text_keeps_whitelisted_markup_only() -> None:
    cleaned = sanitize_rich_text(
        '<p>Thông báo <strong>quan trọng</strong></p><img src=x onerror=alert(1)>',
        1000,
        "body",
    )
    assert "<strong>" in cleaned
    assert "img" not in cleaned
    assert "onerror" not in cleaned
