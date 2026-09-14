"""Đối soát sổ buổi trên dữ liệu thật.

    uv run python -m scripts.reconcile_ledger
    uv run python -m scripts.reconcile_ledger --json

Chạy **đúng bảy mệnh đề** mà bộ test chạy, bằng cách import chung một module.
Một script đối soát riêng "gần giống" bộ test là một script sẽ kiểm những điều
khác với điều đã được chứng minh là bắt được lỗi.

Vì sao không kiểm "số dư = SUM(delta)" rồi thôi: số dư *được định nghĩa* là
`SUM(delta)`, nên phép kiểm đó so một đại lượng với chính nó và luôn xanh, kể
cả trên một CSDL hỏng hoàn toàn. `balance_cached` là biểu diễn thứ hai độc
lập, và bảy mệnh đề là những điều **có thể sai**.

Mã thoát khác 0 khi có vi phạm, để chạy được trong cron hoặc bước triển khai.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict

from app.db import SessionLocal
from app.services.ledger_invariants import INVARIANTS, check_invariants


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Đối soát sổ buổi.")
    parser.add_argument(
        "--json", action="store_true", help="In kết quả dạng JSON cho máy đọc."
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=5,
        help="Số bản ghi ví dụ in kèm mỗi vi phạm.",
    )
    args = parser.parse_args(argv)

    with SessionLocal() as db:
        violations = check_invariants(db, sample_limit=args.samples)

    if args.json:
        print(
            json.dumps(
                {
                    "checked": [item.code for item in INVARIANTS],
                    "violations": [asdict(item) for item in violations],
                },
                ensure_ascii=False,
                indent=2,
                default=str,
            )
        )
    elif not violations:
        print(f"Sổ buổi sạch — {len(INVARIANTS)} mệnh đề đều đúng.")
    else:
        print(
            f"Sổ buổi vi phạm {len(violations)}/{len(INVARIANTS)} mệnh đề:",
            file=sys.stderr,
        )
        for item in violations:
            print(
                f"- {item.code}: {item.description} ({item.total} bản ghi)",
                file=sys.stderr,
            )
            for sample in item.samples:
                print(f"    {sample}", file=sys.stderr)

    return 1 if violations else 0


if __name__ == "__main__":
    raise SystemExit(main())
