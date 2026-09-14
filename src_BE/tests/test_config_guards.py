"""Cấu hình PROD phải chết ngay lúc khởi động nếu bí mật chưa được đặt (F00)."""

from __future__ import annotations

import pytest

from app.config import DEV_JWT_SECRET, Settings

_PROD = {
    "environment": "prod",
    "database_url": "postgresql+psycopg://u:p@db:5432/pilates",
}


def test_prod_rejects_default_jwt_secret() -> None:
    """Một lần triển khai quên `JWT_SECRET` không được phép chạy im lặng.

    Nếu chạy được, bất kỳ ai biết mã nguồn cũng ký được token
    `{"sub": "1", "role": "ADMIN"}` — không cần mật khẩu của ai cả.
    """
    with pytest.raises(ValueError, match="mặc định"):
        Settings(**_PROD, jwt_secret=DEV_JWT_SECRET)


def test_prod_rejects_short_jwt_secret() -> None:
    with pytest.raises(ValueError, match="32 ký tự"):
        Settings(**_PROD, jwt_secret="qua-ngan-12345")


def test_prod_accepts_a_real_secret() -> None:
    settings = Settings(**_PROD, jwt_secret="k" * 48)
    assert settings.environment == "prod"


def test_dev_keeps_the_default_secret_usable() -> None:
    """DEV vẫn chạy được với bí mật mặc định — cổng chỉ áp cho PROD."""
    settings = Settings(environment="dev", jwt_secret=DEV_JWT_SECRET)
    assert settings.jwt_secret == DEV_JWT_SECRET
