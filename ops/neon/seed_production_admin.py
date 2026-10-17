"""Create the first production admin without putting its password in a command line."""

from __future__ import annotations

import os
import secrets
import subprocess
import sys
from pathlib import Path

import psycopg
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from dotenv import dotenv_values, set_key

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "src_BE"
NEON_ENV = ROOT / ".env.local"
ADMIN_ENV = ROOT / ".env.production-admin"


def main() -> int:
    neon = dotenv_values(NEON_ENV)
    if neon.get("NEON_BRANCH") != "production":
        raise RuntimeError("Refusing to seed admin unless .env.local points to production")
    if not neon.get("DATABASE_URL") or not neon.get("DATABASE_URL_UNPOOLED"):
        raise RuntimeError("Production Neon database URLs are missing")
    env = os.environ.copy()
    env.update({key: value for key, value in neon.items() if value is not None})
    env["ENVIRONMENT"] = "prod"
    env["JWT_SECRET"] = secrets.token_urlsafe(32)
    env["PYTHONIOENCODING"] = "utf-8"
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"],
                   cwd=BACKEND, env=env, check=True)

    existing = dotenv_values(ADMIN_ENV) if ADMIN_ENV.is_file() else {}
    with psycopg.connect(neon["DATABASE_URL_UNPOOLED"]) as conn, conn.cursor() as cursor:
        cursor.execute(
            "SELECT password_hash FROM user_account WHERE email = %s",
            ("admin@jpilate.com",),
        )
        row = cursor.fetchone()
    if row:
        password = existing.get("SEED_ADMIN_PASSWORD")
        if not password:
            raise RuntimeError("Admin already exists but local password record is missing")
        try:
            PasswordHasher().verify(row[0], password)
        except (InvalidHashError, VerifyMismatchError) as error:
            raise RuntimeError("Saved admin password does not match production") from error
    else:
        if not ADMIN_ENV.is_file():
            ADMIN_ENV.touch()
        if not existing.get("SEED_ADMIN_PASSWORD"):
            set_key(str(ADMIN_ENV), "SEED_ADMIN_PASSWORD", secrets.token_urlsafe(32))
    set_key(str(ADMIN_ENV), "SEED_ADMIN_EMAIL", "admin@jpilate.com")
    admin = dotenv_values(ADMIN_ENV)
    env.update({key: value for key, value in admin.items() if value is not None})
    subprocess.run([sys.executable, "-m", "scripts.seed_admin"],
                   cwd=BACKEND, env=env, check=True)
    print(f"Production admin credentials saved locally in {ADMIN_ENV} (gitignored).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Production admin seed failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
