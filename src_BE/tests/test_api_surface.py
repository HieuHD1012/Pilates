"""Bảng endpoint trong tài liệu phải khớp bề mặt thật của ứng dụng.

Bảng ở `docs/api/README.md` được sinh ra từ các router, nhưng sinh xong nó là
một tệp nằm trên đĩa và người ta sửa được bằng tay. Test này đọc **ngược** tệp
markdown đó về thành tập `(method, path) → quyền` rồi so với ứng dụng, nên một
lần sửa tay hay một lỗi trong khâu kết xuất đều lộ ra.

Nhãn quyền sai nguy hiểm hơn thiếu hẳn: ghi "công khai" cho một đường chỉ ADMIN
mới vào được thì FE dựng màn hình cho nhầm vai, và lỗi lộ ra ở tay người dùng
thật.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from scripts.gen_api_docs import live_surface

DOC = Path(__file__).resolve().parents[2] / "docs/api/README.md"

#: Dòng bảng mục lục: `| `GET` | `/path` | quyền | [chi tiết](...) |`
_ROW = re.compile(r"^\|\s*`([A-Z]+)`\s*\|\s*`(/[^`]*)`\s*\|\s*([^|]+?)\s*\|.*$")


def _documented_surface() -> dict[tuple[str, str], str]:
    rows: dict[tuple[str, str], str] = {}
    for line in DOC.read_text().splitlines():
        match = _ROW.match(line.strip())
        if match:
            method, path, label = match.groups()
            rows[(method, path)] = label.strip()
    return rows


@pytest.fixture(scope="module")
def surfaces() -> tuple[dict, dict]:
    return live_surface(), _documented_surface()


def test_every_endpoint_is_documented(surfaces) -> None:
    live, documented = surfaces
    missing = sorted(set(live) - set(documented))
    assert not missing, (
        "Endpoint có trong ứng dụng nhưng thiếu ở docs/api/README.md:\n"
        + "\n".join(f"| `{m}` | `{p}` | {live[(m, p)]} |" for m, p in missing)
    )


def test_no_documented_endpoint_has_disappeared(surfaces) -> None:
    """Endpoint đã gỡ mà tài liệu còn giữ là cái bẫy đắt nhất.

    FE dựng xong một màn hình rồi mới biết đường dẫn đó không tồn tại.
    """
    live, documented = surfaces
    stale = sorted(set(documented) - set(live))
    assert not stale, (
        "Endpoint còn trong tài liệu nhưng đã không còn trong ứng dụng:\n"
        + "\n".join(f"{m} {p}" for m, p in stale)
    )


def test_documented_permissions_match_the_code(surfaces) -> None:
    live, documented = surfaces
    wrong = [
        (method, path, documented[(method, path)], label)
        for (method, path), label in live.items()
        if (method, path) in documented and documented[(method, path)] != label
    ]
    assert not wrong, "Nhãn quyền trong tài liệu lệch với mã:\n" + "\n".join(
        f"{m} {p}: tài liệu ghi '{doc}', mã là '{code}'" for m, p, doc, code in wrong
    )
