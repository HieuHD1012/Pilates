"""Seed an explicitly named, expiring Neon demo branch through the real API."""

from __future__ import annotations

import os
import secrets
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import dotenv_values, set_key

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "src_BE"
ENV_FILE = ROOT / ".env.deploy-demo"
EXPECTED_BRANCH = "deploy-demo"


def run_module(env: dict[str, str], *args: str) -> None:
    subprocess.run([sys.executable, "-m", *args], cwd=BACKEND, env=env, check=True)


def free_local_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_for_api(url: str, process: subprocess.Popen) -> None:
    for _ in range(60):
        if process.poll() is not None:
            raise RuntimeError("Local demo API exited before health check")
        try:
            with urllib.request.urlopen(url + "/health", timeout=1) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.5)
    raise RuntimeError("Local demo API did not become healthy")


def main() -> int:
    if not ENV_FILE.is_file():
        raise RuntimeError("Run neon env pull --branch deploy-demo --file .env.deploy-demo first")
    values = dotenv_values(ENV_FILE)
    if values.get("NEON_BRANCH") != EXPECTED_BRANCH:
        raise RuntimeError("Refusing to seed a branch other than deploy-demo")
    if not all(values.get(name) for name in (
        "DATABASE_URL", "DATABASE_URL_UNPOOLED", "AWS_ENDPOINT_URL_S3",
        "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION",
    )):
        raise RuntimeError("Missing demo branch Postgres or Object Storage credentials")
    if not values.get("SEED_ADMIN_PASSWORD"):
        set_key(str(ENV_FILE), "SEED_ADMIN_PASSWORD", secrets.token_urlsafe(32))
        values = dotenv_values(ENV_FILE)
    set_key(str(ENV_FILE), "SEED_ADMIN_EMAIL", "admin@jpilate.com")
    values = dotenv_values(ENV_FILE)

    env = os.environ.copy()
    env.update({key: value for key, value in values.items() if value is not None})
    env["ENVIRONMENT"] = "dev"
    env["STORAGE_BACKEND"] = "s3"
    env["STORAGE_BUCKET"] = "assets"
    env["CORS_ORIGINS"] = '["http://localhost:5177"]'
    env["JWT_SECRET"] = secrets.token_urlsafe(32)
    env["PYTHONIOENCODING"] = "utf-8"

    run_module(env, "alembic", "upgrade", "head")
    run_module(env, "scripts.seed_admin")
    port = free_local_port()
    base_url = f"http://127.0.0.1:{port}"
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
         "--port", str(port), "--workers", "1"],
        cwd=BACKEND, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        wait_for_api(base_url, process)
        run_module(env, "scripts.seed_demo_studio", "--base-url", base_url,
                   "--allow-remote-demo")
    finally:
        process.terminate()
        process.wait(timeout=10)
    print(f"Demo branch seeded. Admin credentials are in {ENV_FILE} (gitignored).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Demo seed failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
