"""Đồng thời ở tầng xác thực (F01).

Các lỗi dưới đây đều **tuần tự thì đúng**: xoay vòng refresh token chặn được
lần dùng lại, token đặt lại dùng một lần rồi hỏng. Chỉ khi hai request chạy
song song mới lộ ra rằng phép kiểm nằm giữa một lần đọc và một lần ghi.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.rules import Role
from app.models.user import RefreshToken
from tests.conftest import login, make_user

NEW_PASSWORD_A = "MatKhauSongSongA#26"
NEW_PASSWORD_B = "MatKhauSongSongB#26"


def _post_twice(client: TestClient, url: str, payload: dict) -> list[int]:
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(client.post, url, json=payload) for _ in range(2)]
        return [future.result().status_code for future in futures]


def test_parallel_refresh_does_not_log_the_user_out(
    concurrent_client: TestClient, db: Session
) -> None:
    """Hai request `/auth/refresh` song song không được đá người dùng ra.

    SPA thường bắn nhiều request cùng lúc khi access token hết hạn. Không khoá
    hàng thì cả hai cùng thấy token còn sống, cả hai cùng xoay vòng, và lần
    thứ hai kích hoạt "phát hiện tái sử dụng" — thu hồi sạch mọi phiên của một
    người dùng không làm gì sai.
    """
    user = make_user(db, Role.STUDENT)
    tokens = login(concurrent_client, user.email)

    _post_twice(concurrent_client, "/auth/refresh", {"refresh_token": tokens["refresh_token"]})

    live = db.scalar(
        select(func.count())
        .select_from(RefreshToken)
        .where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.replaced_by.is_(None),
        )
    )
    assert live == 1, "Người dùng bị đá khỏi mọi thiết bị dù không làm gì sai"


def test_parallel_password_reset_uses_the_token_once(
    concurrent_client: TestClient, db: Session
) -> None:
    """Token đặt lại phải dùng được **đúng một lần**, kể cả khi bấm hai lần.

    Đọc-rồi-ghi thì cả hai request đều thấy `used_at IS NULL`, cả hai đổi mật
    khẩu, và mật khẩu cuối cùng là bất định — người dùng không biết mình đang
    giữ mật khẩu nào.
    """
    user = make_user(db, Role.STAFF)
    with patch("app.api.auth.send_password_reset") as sender:
        concurrent_client.post("/auth/forgot-password", json={"email": user.email})
    raw_token = sender.call_args.args[1]

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(
                concurrent_client.post,
                "/auth/reset-password",
                json={"token": raw_token, "new_password": password},
            )
            for password in (NEW_PASSWORD_A, NEW_PASSWORD_B)
        ]
        statuses = sorted(future.result().status_code for future in futures)

    assert statuses == [200, 401], statuses
