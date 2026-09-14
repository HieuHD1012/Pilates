"""Giới hạn tần suất cho `/auth/login`, `/auth/forgot-password` và form tư vấn.

Bộ đếm nằm trong bộ nhớ tiến trình. Ở quy mô một studio đây là hành vi thật và
đủ, **với điều kiện chạy một worker** — `uvicorn --workers N` sẽ lặng lẽ nhân
mọi ngưỡng lên N lần vì mỗi worker giữ bộ đếm riêng. Ràng buộc này ghi ở
`docs/business-rules.md` §12 và phải được giữ ở lệnh khởi chạy PROD.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field

from fastapi import Request

from app.config import get_settings
from app.core.errors import RateLimitedError

#: Quá số key này thì dọn các bucket đã nguội. Key đến từ dữ liệu người dùng
#: nhập (email, IP) nên không dọn là để tiến trình phình vô hạn: một triệu
#: request `/auth/login` với một triệu email khác nhau là một triệu bucket sống
#: vĩnh viễn, dù `hits` bên trong đã hết hạn từ lâu.
_PRUNE_THRESHOLD = 10_000


@dataclass
class _Bucket:
    hits: list[float] = field(default_factory=list)
    #: Số lần vượt ngưỡng liên tiếp — dùng để tăng dần thời gian chặn.
    strikes: int = 0
    blocked_until: float = 0.0


class RateLimiter:
    """Cửa sổ trượt kèm backoff luỹ tiến.

    Tách `assert_allowed` (chỉ kiểm) khỏi `register` (ghi nhận một lần xảy ra)
    để nơi gọi quyết định được cái gì đáng tính. Luồng đăng nhập chỉ tính lần
    **thất bại**: nếu tính cả lần thành công thì kẻ tấn công xen một lần đăng
    nhập thật của chính mình vào giữa để xoá bộ đếm.
    """

    def __init__(self, max_hits: int, window_seconds: int,
                 backoff_base_seconds: int = 0, backoff_max_seconds: int = 0):
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self.backoff_base_seconds = backoff_base_seconds
        self.backoff_max_seconds = backoff_max_seconds
        self._buckets: dict[str, _Bucket] = {}
        self._lock = threading.Lock()

    def assert_allowed(self, key: str, message: str) -> None:
        """Raise 429 nếu key đang bị chặn hoặc đã chạm ngưỡng. Không ghi nhận gì."""
        nowts = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                return
            if bucket.blocked_until > nowts:
                raise RateLimitedError(message, int(bucket.blocked_until - nowts) + 1)
            if len(self._live_hits(bucket, nowts)) >= self.max_hits:
                raise RateLimitedError(message, self._block(bucket, nowts))

    def register(self, key: str) -> None:
        """Ghi nhận một lần xảy ra; chạm ngưỡng thì bắt đầu chặn."""
        nowts = time.monotonic()
        with self._lock:
            self._prune_if_needed(nowts)
            bucket = self._buckets.setdefault(key, _Bucket())
            hits = self._live_hits(bucket, nowts)
            hits.append(nowts)
            if len(hits) >= self.max_hits:
                self._block(bucket, nowts)

    def reset(self, key: str) -> None:
        """Xoá bộ đếm của một key."""
        with self._lock:
            self._buckets.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._buckets.clear()

    # --- nội bộ; mọi hàm dưới đây phải được gọi khi đang giữ `_lock` ---------

    def _live_hits(self, bucket: _Bucket, nowts: float) -> list[float]:
        cutoff = nowts - self.window_seconds
        bucket.hits = [t for t in bucket.hits if t > cutoff]
        return bucket.hits

    def _block(self, bucket: _Bucket, nowts: float) -> int:
        bucket.strikes += 1
        if self.backoff_base_seconds:
            penalty = min(
                self.backoff_base_seconds * (2 ** (bucket.strikes - 1)),
                self.backoff_max_seconds or self.backoff_base_seconds,
            )
        else:
            penalty = self.window_seconds
        bucket.blocked_until = nowts + penalty
        bucket.hits.clear()
        return int(penalty) + 1

    def _prune_if_needed(self, nowts: float) -> None:
        if len(self._buckets) < _PRUNE_THRESHOLD:
            return
        cutoff = nowts - self.window_seconds
        self._buckets = {
            key: bucket
            for key, bucket in self._buckets.items()
            if bucket.blocked_until > nowts or any(t > cutoff for t in bucket.hits)
        }


_settings = get_settings()

#: Chặn brute-force theo **cả** IP và tài khoản: chỉ theo IP thì kẻ tấn công
#: đổi IP là qua; chỉ theo tài khoản thì họ rải mật khẩu qua nhiều tài khoản.
login_limiter = RateLimiter(
    max_hits=_settings.login_max_attempts,
    window_seconds=_settings.login_window_seconds,
    backoff_base_seconds=_settings.login_backoff_base_seconds,
    backoff_max_seconds=_settings.login_backoff_max_seconds,
)

#: `/auth/forgot-password` là endpoint ẩn danh sinh email và ghi CSDL — không
#: giới hạn thì nó vừa là công cụ mail bomb vừa là công cụ dò danh sách email.
password_reset_limiter = RateLimiter(
    max_hits=_settings.password_reset_max_attempts,
    window_seconds=_settings.password_reset_window_seconds,
)

lead_limiter = RateLimiter(
    max_hits=_settings.lead_max_per_ip_per_hour,
    window_seconds=3600,
)


def client_ip(request: Request) -> str:
    """IP của client, chỉ tin `X-Forwarded-For` khi đã khai có proxy đáng tin.

    Tin header lúc chưa có proxy nghĩa là để ai cũng tự khai IP và vòng qua mọi
    cổng theo IP. Không tin header lúc *đã có* proxy thì ngược lại: cả studio
    dùng chung một bucket của proxy, và một kẻ tấn công làm mọi nhân viên nhận
    429.

    Hàm này là **biên tin cậy**, nên chỉ được có đúng một bản: hai bản sao sẽ
    trôi lệch nhau và một trong hai sẽ là bản sai.
    """
    if get_settings().trust_proxy_headers:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
