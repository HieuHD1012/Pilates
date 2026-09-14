"""Nhận, kiểm và lưu ảnh.

Ba mối nguy khác nhau, không cái nào giải quyết được bằng cách tin phần mở rộng:

1. **File không phải ảnh.** Một trang HTML hay SVG đổi tên thành `.jpg` sẽ chạy
   như mã trong origin phục vụ nó. Ở đây file phải **mở được bằng bộ giải mã
   ảnh** mới đi tiếp — đó mới là sniff thật.
2. **EXIF.** Ảnh cơ thể chụp bằng điện thoại mang toạ độ GPS nhà học viên. Mọi
   ảnh được **giải mã rồi mã hoá lại**, nên toàn bộ metadata rơi ra.
3. **Đoán đường dẫn.** Khoá lưu là chuỗi ngẫu nhiên, không suy ra được từ id
   học viên hay tên file gốc.
"""

from __future__ import annotations

import io
import re
import secrets
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from app.config import get_settings
from app.core.errors import ValidationError

#: Định dạng nhận vào. Cố ý không có SVG: SVG là tài liệu chạy được script,
#: không phải ảnh raster.
ACCEPTED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})

#: Mọi ảnh được lưu lại dưới một định dạng duy nhất sau khi mã hoá lại.
STORED_FORMAT = "JPEG"
STORED_CONTENT_TYPE = "image/jpeg"
STORED_SUFFIX = ".jpg"

#: Khoá lưu do hệ thống sinh; mẫu này chặn luôn đường đi ra khỏi thư mục lưu.
_STORAGE_KEY_PATTERN = re.compile(r"^[a-z0-9_]+/[0-9a-f]{32}$")

#: Chặn "decompression bomb": ảnh 64000×64000 nén rất nhỏ nhưng giải nén ra
#: hàng chục GB. Pillow cảnh báo từ ~89 triệu điểm ảnh; siết về mức đủ dùng.
MAX_PIXELS = 40_000_000


@dataclass(frozen=True)
class PreparedImage:
    """Ảnh đã kiểm và mã hoá lại, **chưa** ghi xuống đĩa.

    Tách hai bước để thứ tự ghi đúng được: kiểm ảnh (đắt, hay hỏng) → chèn hàng
    và flush (ràng buộc CSDL lên tiếng ở đây) → mới ghi tệp. Ghi tệp trước rồi
    mới chèn hàng thì mọi lần vi phạm ràng buộc đều để lại một tệp mồ côi.
    """

    storage_key: str
    data: bytes
    content_type: str = STORED_CONTENT_TYPE


@dataclass(frozen=True)
class StoredImage:
    storage_key: str
    content_type: str = STORED_CONTENT_TYPE


def _storage_root() -> Path:
    return Path(get_settings().storage_dir)


def _path_for(storage_key: str) -> Path:
    if not _STORAGE_KEY_PATTERN.match(storage_key):
        raise ValidationError("Khoá ảnh không hợp lệ.", code="INVALID_STORAGE_KEY")
    return _storage_root() / f"{storage_key}{STORED_SUFFIX}"


def prepare_image(raw: bytes, *, prefix: str) -> PreparedImage:
    """Kiểm và bóc metadata. **Không** chạm đĩa.

    `prefix` là nhóm ảnh (`progress`, `trainer`) — chỉ để xếp thư mục, không
    mang thông tin nào đoán được.
    """
    settings = get_settings()
    if not raw:
        raise ValidationError("Tệp rỗng.", code="EMPTY_UPLOAD")
    if len(raw) > settings.upload_max_bytes:
        limit_mb = settings.upload_max_bytes // (1024 * 1024)
        raise ValidationError(f"Ảnh vượt quá {limit_mb} MB.", code="UPLOAD_TOO_LARGE")

    try:
        with Image.open(io.BytesIO(raw)) as probe:
            detected = probe.format
            width, height = probe.size
            probe.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValidationError(
            "Tệp này không phải ảnh hợp lệ.", code="NOT_AN_IMAGE"
        ) from exc

    if detected not in ACCEPTED_FORMATS:
        raise ValidationError(
            f"Chỉ nhận ảnh {', '.join(sorted(ACCEPTED_FORMATS))}.",
            code="UNSUPPORTED_IMAGE_FORMAT",
        )
    if width * height > MAX_PIXELS:
        raise ValidationError("Ảnh có kích thước quá lớn.", code="IMAGE_TOO_LARGE")

    # `verify()` đóng file, nên phải mở lại để thực sự đọc điểm ảnh.
    with Image.open(io.BytesIO(raw)) as image:
        # Mã hoá lại từ dữ liệu điểm ảnh: EXIF, ICC và mọi khối metadata khác
        # đều không theo sang. JPEG không có kênh alpha nên phải phẳng hoá.
        if image.mode in ("RGBA", "LA", "P"):
            flattened = Image.new("RGB", image.size, (255, 255, 255))
            converted = image.convert("RGBA")
            flattened.paste(converted, mask=converted.split()[-1])
            image = flattened
        elif image.mode != "RGB":
            image = image.convert("RGB")

        buffer = io.BytesIO()
        image.save(buffer, format=STORED_FORMAT, quality=88, optimize=True)

    return PreparedImage(
        storage_key=f"{prefix}/{secrets.token_hex(16)}", data=buffer.getvalue()
    )


def write_prepared(prepared: PreparedImage) -> StoredImage:
    """Ghi ảnh đã kiểm xuống đĩa."""
    path = _path_for(prepared.storage_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(prepared.data)
    return StoredImage(storage_key=prepared.storage_key)


def store_image(raw: bytes, *, prefix: str) -> StoredImage:
    """Kiểm rồi ghi ngay — tiện cho script và test, không dùng trong route."""
    return write_prepared(prepare_image(raw, prefix=prefix))


def read_image(storage_key: str) -> bytes:
    path = _path_for(storage_key)
    if not path.is_file():
        raise ValidationError("Không tìm thấy tệp ảnh.", code="IMAGE_NOT_FOUND")
    return path.read_bytes()


def delete_image(storage_key: str) -> None:
    _path_for(storage_key).unlink(missing_ok=True)


def read_upload(file) -> bytes:
    """Đọc nội dung một `UploadFile`, chặn kích thước **trước** khi nạp vào RAM.

    `file.file.read()` trần sẽ đọc trọn body rồi mới tới phép kiểm dung lượng —
    một tài khoản hợp lệ gửi vài request 2 GB song song là đủ làm cạn bộ nhớ.
    Starlette đặt sẵn `size`; đọc thừa đúng một byte để bắt cả trường hợp
    `size` vắng mặt.
    """
    limit = get_settings().upload_max_bytes
    declared = getattr(file, "size", None)
    if declared is not None and declared > limit:
        raise ValidationError(
            f"Ảnh vượt quá {limit // (1024 * 1024)} MB.", code="UPLOAD_TOO_LARGE"
        )

    raw = file.file.read(limit + 1)
    if len(raw) > limit:
        raise ValidationError(
            f"Ảnh vượt quá {limit // (1024 * 1024)} MB.", code="UPLOAD_TOO_LARGE"
        )
    return raw
