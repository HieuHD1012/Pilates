"""Copy a Postgres dump and current Neon images to private R2.

The database and object store have no shared transaction boundary. Run during
quiet hours and test a full restore before handling real customer data. The
manifest is written last; a missing manifest means a partial attempt.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

POSTGRES_MAJOR = 16  # Match Neon's server major; older servers reject PG18 restore SQL.
POSTGRES_IMAGE = f"postgres:{POSTGRES_MAJOR}-alpine"
SOURCE_BUCKET = "assets"
MAX_OBJECT_BYTES = 8 * 1024 * 1024


def required(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"Missing {name}")
    return value


def client(endpoint: str, region: str, key: str, secret: str):
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        region_name=region,
        aws_access_key_id=key,
        aws_secret_access_key=secret,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def dump_database(path: Path, database_url: str) -> None:
    if database_url.startswith("postgresql+psycopg://"):
        database_url = database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    if not database_url.startswith("postgresql://"):
        raise RuntimeError("NEON_DATABASE_URL_UNPOOLED must be a Postgres URL")

    docker_env = os.environ.copy()
    docker_env["PG_DUMP_URL"] = database_url
    version_check = subprocess.run(
        ["docker", "run", "--rm", "-e", "PG_DUMP_URL", POSTGRES_IMAGE,
         "sh", "-c", 'exec psql "$PG_DUMP_URL" -Atqc "SHOW server_version_num"'],
        env=docker_env, capture_output=True, check=False,
    )
    if version_check.returncode:
        raise RuntimeError("Could not read Neon PostgreSQL server version")
    try:
        server_major = int(version_check.stdout.strip()) // 10000
    except ValueError as error:
        raise RuntimeError("Neon returned an invalid PostgreSQL server version") from error
    if server_major != POSTGRES_MAJOR:
        raise RuntimeError(
            f"Backup client PostgreSQL {POSTGRES_MAJOR} does not match Neon server {server_major}"
        )
    command = [
        "docker", "run", "--rm", "-e", "PG_DUMP_URL", POSTGRES_IMAGE,
        "sh", "-c", 'exec pg_dump --format=custom --no-owner --no-acl "$PG_DUMP_URL"',
    ]
    with path.open("wb") as output:
        result = subprocess.run(command, env=docker_env, stdout=output, stderr=subprocess.PIPE,
                                check=False)
    if result.returncode:
        raise RuntimeError(f"pg_dump failed (exit {result.returncode}); inspect runner logs")
    if path.stat().st_size == 0:
        raise RuntimeError("pg_dump returned an empty file")

    # Confirm the archive is readable before uploading it.
    check = subprocess.run(
        ["docker", "run", "--rm", "-v", f"{path.parent.resolve()}:/backup:ro",
         POSTGRES_IMAGE, "pg_restore", "--list", "/backup/database.dump"],
        stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=False,
    )
    if check.returncode:
        raise RuntimeError(f"pg_restore could not read the archive (exit {check.returncode})")


def existing_metadata(r2, bucket: str, key: str) -> dict | None:
    try:
        return r2.head_object(Bucket=bucket, Key=key)
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
            return None
        raise


def copy_images(neon, r2, bucket: str) -> list[dict[str, object]]:
    images: list[dict[str, object]] = []
    pages = neon.get_paginator("list_objects_v2").paginate(Bucket=SOURCE_BUCKET)
    for page in pages:
        for source in page.get("Contents", []):
            key = source["Key"]
            etag = source["ETag"].strip('"')
            size = source["Size"]
            if size > MAX_OBJECT_BYTES:
                raise RuntimeError(f"Source object exceeds expected image limit: {key}")
            identity = hashlib.sha256(f"{SOURCE_BUCKET}/{key}\0{etag}".encode()).hexdigest()
            backup_key = f"objects/{identity}"
            previous = existing_metadata(r2, bucket, backup_key)
            if previous:
                if previous["ContentLength"] != size or not previous["Metadata"].get("sha256"):
                    raise RuntimeError(f"Existing R2 object failed verification: {backup_key}")
                digest = previous["Metadata"]["sha256"]
            else:
                response = neon.get_object(Bucket=SOURCE_BUCKET, Key=key, IfMatch=source["ETag"])
                raw = response["Body"].read(MAX_OBJECT_BYTES + 1)
                if len(raw) != size:
                    raise RuntimeError(f"Source object changed while backing up: {key}")
                digest = hashlib.sha256(raw).hexdigest()
                r2.put_object(
                    Bucket=bucket, Key=backup_key, Body=raw,
                    ContentType=response.get("ContentType", "application/octet-stream"),
                    Metadata={"sha256": digest},
                )
                verified = existing_metadata(r2, bucket, backup_key)
                if not verified or verified["ContentLength"] != size or verified["Metadata"].get(
                    "sha256"
                ) != digest:
                    raise RuntimeError(f"R2 image verification failed: {backup_key}")
            images.append({
                "source_key": key, "backup_key": backup_key, "etag": etag,
                "size": size, "sha256": digest,
            })
    return images


def main() -> int:
    database_url = required("NEON_DATABASE_URL_UNPOOLED")
    r2_bucket = required("R2_BUCKET")
    neon = client(
        required("NEON_AWS_ENDPOINT_URL_S3"), "ap-southeast-1",
        required("NEON_AWS_ACCESS_KEY_ID"), required("NEON_AWS_SECRET_ACCESS_KEY"),
    )
    r2 = client(
        "https://530c58515a986494f59545756787c4df.r2.cloudflarestorage.com",
        "auto", required("R2_ACCESS_KEY_ID"), required("R2_SECRET_ACCESS_KEY"),
    )
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    with tempfile.TemporaryDirectory(prefix="j-pilate-backup-") as temp:
        dump_path = Path(temp) / "database.dump"
        dump_database(dump_path, database_url)
        dump_size = dump_path.stat().st_size
        dump_sha = sha256_file(dump_path)
        dump_key = f"postgres/{timestamp}.dump"
        with dump_path.open("rb") as stream:
            r2.upload_fileobj(
                stream, r2_bucket, dump_key,
                ExtraArgs={"ContentType": "application/octet-stream", "Metadata": {"sha256": dump_sha}},
            )
        verified = existing_metadata(r2, r2_bucket, dump_key)
        if not verified or verified["ContentLength"] != dump_size or verified["Metadata"].get(
            "sha256"
        ) != dump_sha:
            raise RuntimeError("R2 database archive verification failed")

        images = copy_images(neon, r2, r2_bucket)
        manifest = {
            "format": 1,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "database": {"key": dump_key, "size": dump_size, "sha256": dump_sha},
            "neon_bucket": SOURCE_BUCKET,
            "images": images,
        }
        r2.put_object(
            Bucket=r2_bucket, Key=f"snapshots/{timestamp}.json",
            Body=json.dumps(manifest, ensure_ascii=False, separators=(",", ":")).encode(),
            ContentType="application/json",
        )
        print(f"R2 snapshot complete: {timestamp}, {len(images)} images, {dump_size} dump bytes")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ClientError) as error:
        print(f"Backup failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
