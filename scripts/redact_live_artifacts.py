"""Redact credentials from browser evidence before uploading CI artifacts."""

from __future__ import annotations

import io
import os
import re
import sys
import zipfile
from pathlib import Path


def redact(data: bytes) -> bytes:
    try:
        value = data.decode("utf-8")
    except UnicodeDecodeError:
        return data
    for secret in [os.getenv(key) for key in ("JWT_SECRET", "SEED_ADMIN_PASSWORD")] + [
        "ci-disposable-password-2026",
        "ci-reset-password-2026",
        "ci-changed-password-2026",
    ]:
        if secret:
            value = value.replace(secret, "[REDACTED]")
    value = re.sub(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[REDACTED]", value)
    value = re.sub(r'(?i)(Bearer\s+)[^\s"\\]+', r"\1[REDACTED]", value)
    value = re.sub(r'(?i)(token=)[^&\s"<>\\]+', r"\1[REDACTED]", value)
    value = re.sub(
        r'(?i)("(?:access_token|refresh_token|token|password|new_password)"\s*:\s*")[^"\n]*',
        r"\1[REDACTED]",
        value,
    )
    return value.encode("utf-8")


def main() -> None:
    for name in sys.argv[1:]:
        root = Path(name).resolve()
        if root.name not in {"test-results", "playwright-report"}:
            raise SystemExit("Only Playwright output directories can be redacted")
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix == ".zip":
                out = io.BytesIO()
                with (
                    zipfile.ZipFile(path) as src,
                    zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst,
                ):
                    for item in src.infolist():
                        dst.writestr(item, redact(src.read(item)))
                path.write_bytes(out.getvalue())
            elif path.suffix in {".json", ".txt", ".log", ".md", ".html", ".trace", ".network"}:
                path.write_bytes(redact(path.read_bytes()))
    print("Live browser artifacts redacted")


if __name__ == "__main__":
    main()
