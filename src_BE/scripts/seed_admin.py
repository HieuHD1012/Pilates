"""Tạo tài khoản ADMIN đầu tiên từ biến môi trường.

Không hardcode tài khoản trong mã nguồn và không sinh mật khẩu suy ra được.
Chạy lại nhiều lần không tạo trùng.

    SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... uv run python -m scripts.seed_admin
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from app.config import get_settings
from app.core.security import hash_password
from app.db import SessionLocal
from app.domain.rules import Role, UserStatus
from app.models.user import User


def main() -> int:
    settings = get_settings()
    if not settings.seed_admin_email or not settings.seed_admin_password:
        print("Cần đặt SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD.", file=sys.stderr)
        return 1
    if len(settings.seed_admin_password) < 10:
        print("SEED_ADMIN_PASSWORD phải dài ít nhất 10 ký tự.", file=sys.stderr)
        return 1

    email = settings.seed_admin_email.lower()
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)) is not None:
            print(f"Tài khoản {email} đã tồn tại, không tạo lại.")
            return 0

        db.add(
            User(
                email=email,
                full_name="Quản trị viên",
                role=Role.ADMIN,
                status=UserStatus.ACTIVE,
                password_hash=hash_password(settings.seed_admin_password),
            )
        )
        db.commit()
    print(f"Đã tạo tài khoản ADMIN: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
