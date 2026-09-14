"""Cấu hình ứng dụng. Mọi bí mật đến từ biến môi trường, không bao giờ nằm trong mã nguồn."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

#: Giá trị chỉ dùng được ở DEV/test. Không bao giờ được chạy ở PROD.
DEV_JWT_SECRET = "dev-only-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    environment: Literal["dev", "test", "prod"] = "dev"

    database_url: PostgresDsn = Field(
        default="postgresql+psycopg://pilates:pilates@localhost:5433/pilates"
    )

    # --- Xác thực -------------------------------------------------------
    jwt_secret: str = Field(default=DEV_JWT_SECRET, min_length=8)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    #: Trong ngần này giây sau khi xoay vòng, một lần gửi trùng cùng refresh
    #: token được trả lại đúng bản thay thế thay vì bị coi là trộm token.
    #: Đủ rộng cho vài request song song của SPA, đủ hẹp để một lần replay
    #: thật vẫn bị bắt.
    refresh_reuse_grace_seconds: int = 10
    password_reset_minutes: int = 30

    # --- Chặn brute-force /auth/login (F01) -----------------------------
    login_max_attempts: int = 5
    login_window_seconds: int = 300
    login_backoff_base_seconds: int = 30
    login_backoff_max_seconds: int = 900

    # --- Giới hạn /auth/forgot-password ---------------------------------
    password_reset_max_attempts: int = 3
    password_reset_window_seconds: int = 900

    # --- Form tư vấn công khai (F02) ------------------------------------
    lead_max_per_ip_per_hour: int = 10
    lead_duplicate_window_minutes: int = 60

    # --- Email giao dịch (F00) ------------------------------------------
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = False
    email_from: str = "no-reply@pilates.local"
    password_reset_url_template: str = "http://localhost:5173/dat-lai-mat-khau?token={token}"

    # --- Tài khoản ADMIN khởi tạo ----------------------------------------
    seed_admin_email: str | None = None
    seed_admin_password: str | None = None

    # --- Ảnh và upload (F03) ---------------------------------------------
    storage_dir: str = "var/storage"
    upload_max_bytes: int = 8 * 1024 * 1024

    # --- CORS (F00) -------------------------------------------------------
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    #: Bật khi API đứng sau reverse proxy đáng tin (nginx, Cloudflare). Khi tắt,
    #: `X-Forwarded-For` bị bỏ qua hoàn toàn — tin header lúc chưa có proxy là
    #: cho phép bất kỳ ai tự khai IP và vòng qua cổng chống brute-force.
    trust_proxy_headers: bool = False

    @model_validator(mode="after")
    def _reject_dev_secrets_in_prod(self) -> Settings:
        """Ở PROD, bí mật mặc định phải làm ứng dụng chết ngay lúc khởi động.

        Không có phép kiểm này, một lần triển khai quên đặt `JWT_SECRET` vẫn
        chạy bình thường, không lỗi, không cảnh báo — và bất kỳ ai biết mã
        nguồn đều ký được token `{"sub": "1", "role": "ADMIN"}`.
        """
        if self.environment != "prod":
            return self
        if self.jwt_secret == DEV_JWT_SECRET:
            raise ValueError("JWT_SECRET vẫn là giá trị mặc định của DEV — không chạy PROD được.")
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET ở PROD phải dài ít nhất 32 ký tự.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
