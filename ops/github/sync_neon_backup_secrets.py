"""Send production Neon backup credentials to GitHub Actions over stdin."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "HieuHD1012/Pilates"
SOURCES = {
    "NEON_DATABASE_URL_UNPOOLED": "DATABASE_URL_UNPOOLED",
    "NEON_AWS_ENDPOINT_URL_S3": "AWS_ENDPOINT_URL_S3",
    "NEON_AWS_ACCESS_KEY_ID": "AWS_ACCESS_KEY_ID",
    "NEON_AWS_SECRET_ACCESS_KEY": "AWS_SECRET_ACCESS_KEY",
}


def gh_executable() -> str:
    found = shutil.which("gh")
    if found:
        return found
    windows_install = Path("C:/Program Files/GitHub CLI/gh.exe")
    if windows_install.is_file():
        return str(windows_install)
    raise SystemExit("GitHub CLI is not installed")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rotate", action="store_true", help="Update existing Neon secrets")
    args = parser.parse_args()
    values = dotenv_values(ROOT / ".env.local")
    if values.get("NEON_BRANCH") != "production":
        raise SystemExit("Refusing to sync non-production Neon credentials")
    missing = [source for source in SOURCES.values() if not values.get(source)]
    if missing:
        raise SystemExit(f"Missing Neon variables: {', '.join(missing)}")

    gh = gh_executable()
    listed = subprocess.run(
        [gh, "secret", "list", "--repo", REPOSITORY, "--json", "name"],
        capture_output=True, check=False,
    )
    if listed.returncode:
        raise SystemExit("Cannot list GitHub secrets; run gh auth login first")
    existing = {item["name"] for item in json.loads(listed.stdout)}
    for name, source in SOURCES.items():
        if name in existing and not args.rotate:
            print(f"{name}: already configured")
            continue
        result = subprocess.run(
            [gh, "secret", "set", name, "--repo", REPOSITORY, "--app", "actions"],
            input=values[source].encode(), capture_output=True, check=False,
        )
        if result.returncode:
            raise SystemExit(f"Failed to configure GitHub secret {name}")
        print(f"{name}: configured")


if __name__ == "__main__":
    main()
