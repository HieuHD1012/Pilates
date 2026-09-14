"""Kiểm và làm sạch ảnh tải lên (F03).

Ba mối nguy, ba nhóm test: tệp không phải ảnh, metadata vị trí, và kích thước.
"""

from __future__ import annotations

import io

import piexif
import pytest
from PIL import Image

from app.config import get_settings
from app.core.errors import ValidationError
from app.core.upload_guard import read_image, store_image


def _image_bytes(fmt: str = "JPEG", size: tuple[int, int] = (64, 64), **save_kwargs) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (120, 140, 160)).save(buffer, format=fmt, **save_kwargs)
    return buffer.getvalue()


def _jpeg_with_gps() -> bytes:
    """Ảnh JPEG mang toạ độ GPS — đúng thứ điện thoại gắn vào mọi ảnh chụp."""
    exif = {
        "0th": {piexif.ImageIFD.Make: b"TestPhone"},
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: b"N",
            piexif.GPSIFD.GPSLatitude: ((12, 1), (14, 1), (0, 1)),
            piexif.GPSIFD.GPSLongitudeRef: b"E",
            piexif.GPSIFD.GPSLongitude: ((109, 1), (11, 1), (0, 1)),
        },
        "Exif": {},
        "1st": {},
        "thumbnail": None,
    }
    return _image_bytes(exif=piexif.dump(exif))


# --- Tệp không phải ảnh ------------------------------------------------------


@pytest.mark.parametrize(
    ("payload", "label"),
    [
        (b"<html><script>alert(1)</script></html>", "HTML đổi tên thành .jpg"),
        (b'<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', "SVG"),
        (b"GIF89a" + b"\x00" * 32, "GIF hỏng"),
        (b"khong phai anh", "văn bản thuần"),
    ],
)
def test_non_image_upload_rejected(payload: bytes, label: str) -> None:
    """Phần mở rộng không nói lên gì — file phải **mở được bằng bộ giải mã ảnh**.

    Một trang HTML đổi tên thành `.jpg` mà được phục vụ lại từ origin của API
    sẽ chạy như mã trong chính origin đó.
    """
    with pytest.raises(ValidationError) as exc:
        store_image(payload, prefix="progress")
    assert exc.value.status_code == 422, label


def test_empty_upload_rejected() -> None:
    with pytest.raises(ValidationError):
        store_image(b"", prefix="progress")


def test_oversized_upload_rejected() -> None:
    oversized = b"\xff\xd8\xff" + b"\x00" * (get_settings().upload_max_bytes + 1)
    with pytest.raises(ValidationError) as exc:
        store_image(oversized, prefix="progress")
    assert exc.value.code == "UPLOAD_TOO_LARGE"


# --- Metadata ----------------------------------------------------------------


def test_stored_image_has_no_exif() -> None:
    """Ảnh cơ thể mang toạ độ GPS nhà học viên — metadata phải rơi hết.

    Test khẳng định ảnh **gốc thật sự có** GPS trước, rồi mới khẳng định ảnh đã
    lưu thì không: thiếu vế đầu thì test vẫn xanh ngay cả khi việc bóc EXIF
    không chạy.
    """
    original = _jpeg_with_gps()
    assert piexif.load(original)["GPS"], "Ảnh mẫu phải có GPS thì test mới có nghĩa"

    stored = store_image(original, prefix="progress")
    saved = read_image(stored.storage_key)

    assert piexif.load(saved)["GPS"] == {}
    assert Image.open(io.BytesIO(saved)).getexif().get(piexif.ImageIFD.Make) is None


# --- Định dạng chấp nhận -----------------------------------------------------


@pytest.mark.parametrize("fmt", ["JPEG", "PNG", "WEBP"])
def test_accepted_formats_are_normalised_to_jpeg(fmt: str) -> None:
    stored = store_image(_image_bytes(fmt), prefix="progress")
    assert Image.open(io.BytesIO(read_image(stored.storage_key))).format == "JPEG"


def test_transparent_png_is_flattened_not_rejected() -> None:
    buffer = io.BytesIO()
    Image.new("RGBA", (32, 32), (10, 20, 30, 0)).save(buffer, format="PNG")

    stored = store_image(buffer.getvalue(), prefix="progress")
    assert Image.open(io.BytesIO(read_image(stored.storage_key))).mode == "RGB"


# --- Khoá lưu ----------------------------------------------------------------


def test_storage_keys_are_unguessable_and_unique() -> None:
    keys = {store_image(_image_bytes(), prefix="progress").storage_key for _ in range(5)}
    assert len(keys) == 5
    for key in keys:
        prefix, random_part = key.split("/")
        assert prefix == "progress"
        assert len(random_part) == 32


@pytest.mark.parametrize(
    "bad_key",
    ["../../etc/passwd", "progress/../../secret", "progress/khong-phai-hex", "no-slash"],
)
def test_path_traversal_in_storage_key_rejected(bad_key: str) -> None:
    """Khoá lưu do hệ thống sinh; mọi dạng khác phải bị từ chối ngay."""
    with pytest.raises(ValidationError):
        read_image(bad_key)
