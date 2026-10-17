"""Copy the linked Neon branch credentials into GCP Secret Manager.

Run with src_BE/.venv's Python after bootstrap.ps1. Secret bytes are sent to
gcloud over stdin and are never written to a second local file or printed.
Existing enabled versions are left untouched unless --rotate is given.
"""

from __future__ import annotations

import argparse
import secrets
import shutil
import subprocess
from pathlib import Path

from dotenv import dotenv_values

PROJECT = "j-pilate"
ROOT = Path(__file__).resolve().parents[2]
SOURCES = {
    "j-pilate-db-url": "DATABASE_URL",
    "j-pilate-db-url-unpooled": "DATABASE_URL_UNPOOLED",
    "j-pilate-neon-s3-endpoint": "AWS_ENDPOINT_URL_S3",
    "j-pilate-neon-s3-key": "AWS_ACCESS_KEY_ID",
    "j-pilate-neon-s3-secret": "AWS_SECRET_ACCESS_KEY",
}


def gcloud(*args: str, data: bytes | None = None) -> str:
    executable = shutil.which("gcloud")
    if not executable:
        raise SystemExit("gcloud CLI is not installed or not on PATH")
    result = subprocess.run(
        [executable, *args, f"--project={PROJECT}"],
        input=data,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        raise SystemExit(f"gcloud failed for {args[0:3]}: {result.stderr.decode(errors='replace')}")
    return result.stdout.decode().strip()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rotate", action="store_true", help="Add a new version to every secret")
    args = parser.parse_args()

    env_path = ROOT / ".env.local"
    if not env_path.exists():
        raise SystemExit("Missing .env.local; run neon deploy on the linked branch first")
    values = dotenv_values(env_path)
    if values.get("NEON_BRANCH") != "production":
        raise SystemExit("Refusing to sync non-production Neon credentials to Cloud Run")
    missing = [env for env in SOURCES.values() if not values.get(env)]
    if missing:
        raise SystemExit(f"Missing Neon variables: {', '.join(missing)}")

    for name, source in SOURCES.items():
        existing = gcloud(
            "secrets", "versions", "list", name,
            "--filter=state:ENABLED", "--format=value(name)",
        )
        if existing and not args.rotate:
            print(f"{name}: already has an enabled version")
            continue
        gcloud(
            "secrets", "versions", "add", name, "--data-file=-",
            data=values[source].encode("utf-8"),
        )
        print(f"{name}: new version added")

    jwt_name = "j-pilate-jwt-secret"
    existing = gcloud(
        "secrets", "versions", "list", jwt_name,
        "--filter=state:ENABLED", "--format=value(name)",
    )
    if not existing or args.rotate:
        gcloud(
            "secrets", "versions", "add", jwt_name, "--data-file=-",
            data=secrets.token_urlsafe(48).encode("ascii"),
        )
        print(f"{jwt_name}: new version added")
    else:
        print(f"{jwt_name}: already has an enabled version")


if __name__ == "__main__":
    main()
