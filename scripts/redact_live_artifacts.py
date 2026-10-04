"""Redact credentials from browser evidence before uploading CI artifacts."""

from __future__ import annotations

import base64
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
    # Playwright embeds the report JSON as a base64 ZIP inside index.html.
    # Redacting the HTML alone leaves passwords in that encoded archive.
    value = re.sub(
        r"data:application/zip;base64,([A-Za-z0-9+/=]+)",
        lambda match: (
            "data:application/zip;base64,"
            + base64.b64encode(redact_zip(base64.b64decode(match[1]))).decode("ascii")
        ),
        value,
    )
    for secret in [os.getenv(key) for key in ("JWT_SECRET", "SEED_ADMIN_PASSWORD")] + [
        "ci-disposable-password-2026",
        "ci-reset-password-2026",
        "ci-changed-password-2026",
    ]:
        if secret:
            value = value.replace(secret, "[REDACTED]")
    value = re.sub(
        r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "[REDACTED]", value
    )
    value = re.sub(r'(?i)(Bearer\s+)[^\s"\\]+', r"\1[REDACTED]", value)
    value = re.sub(r'(?i)(token=)[^&\s"<>\\]+', r"\1[REDACTED]", value)
    value = re.sub(
        r'(?i)("(?:access_token|refresh_token|token|password|new_password)"\s*:\s*")[^"\n]*',
        r"\1[REDACTED]",
        value,
    )
    return value.encode("utf-8")


def redact_zip(data: bytes) -> bytes:
    out = io.BytesIO()
    with (
        zipfile.ZipFile(io.BytesIO(data)) as src,
        zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst,
    ):
        for item in src.infolist():
            content = src.read(item)
            dst.writestr(
                item,
                redact_zip(content)
                if item.filename.endswith(".zip")
                else redact(content),
            )
    return out.getvalue()


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
                path.write_bytes(redact_zip(path.read_bytes()))
            elif path.suffix in {
                ".json",
                ".txt",
                ".log",
                ".md",
                ".html",
                ".trace",
                ".network",
            }:
                path.write_bytes(redact(path.read_bytes()))
    print("Live browser artifacts redacted")


if __name__ == "__main__":
    main()
