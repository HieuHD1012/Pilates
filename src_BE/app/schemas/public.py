"""Schema cho endpoint công khai — allow-list trường, khai tường minh.

Đường mặc định của FastAPI là tái dùng schema nội bộ, và đó chính là đường rò
rỉ: `/public/trainers` sẽ trả **số điện thoại cá nhân** của HLV, `/public/
schedule` sẽ trả **ai đến lớp nào lúc mấy giờ**. Ở một studio nhỏ, cái sau là
vấn đề an toàn thân thể, không chỉ là quyền riêng tư.

Vì vậy mọi model ở đây:

- liệt kê **đủ và chỉ** những trường được phép ra ngoài;
- **không bao giờ** chứa id nội bộ, số điện thoại, email, hay danh tính học viên.

Lớp chặn thật nằm ở hai chỗ khác, không phải ở `extra="forbid"`: endpoint trong
`app/api/public.py` **chọn tường minh từng cột** (trường không được đọc lên thì
không thể lọt ra), và `tests/test_public_response_allowlist.py` khẳng định đúng
tập khoá của response. `extra="forbid"` chỉ là chốt cuối cho trường hợp ai đó
sau này dựng model từ `**row._mapping`.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.rules import ClassType


class PublicTrainer(BaseModel):
    """HLV trên trang công khai.

    Không có `phone`, không có `user_id`, không có id nội bộ. Không có chứng
    chỉ/bằng cấp/số năm kinh nghiệm — những thứ đó không có chỗ trong model này
    nên không thể lộ ra do sơ ý.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str
    photo_key: str | None = None
    bio: str | None = None


class PublicAnnouncement(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    body: str
    publish_at: datetime | None = None


class PublicPackage(BaseModel):
    """Gói tập trên trang công khai.

    Giá được hiện **khi studio cung cấp**, và để trống có nhãn khi chưa có —
    quy tắc là cấm *bịa* giá, không phải cấm giá.
    """

    model_config = ConfigDict(extra="forbid")

    name: str
    #: Chuỗi thập phân, không phải số thực: tiền không đi qua float, và `None`
    #: (chưa có giá) phải phân biệt được với `"0"`.
    price: str | None = None
    credits: int
    duration_days: int
    class_type: ClassType


class PublicClassSession(BaseModel):
    """Buổi lớp trên lịch công khai.

    `is_full` là **boolean**: không phải danh sách người, cũng không phải số
    đếm. Số chỗ còn lại đã đủ để suy ra lớp nào vắng, và ở một studio nhỏ thì
    "lớp 6h sáng thứ Ba chỉ có 1 người" là thông tin không nên công khai.

    Dùng ở lần chạy hai trong cửa sổ F06, khi `class_session` đã tồn tại.
    """

    model_config = ConfigDict(extra="forbid")

    starts_at: datetime
    ends_at: datetime
    class_type: ClassType
    trainer_name: str
    is_full: bool
