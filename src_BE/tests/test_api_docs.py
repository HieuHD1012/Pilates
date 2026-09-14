"""Tài liệu API chi tiết phải được sinh lại sau mỗi lần đổi bề mặt.

Bộ tài liệu ở `docs/api/` mô tả các endpoint kèm kiểu dữ liệu từng trường. Chép
tay ngần đó thì nó lệch với mã nguồn trong vài tuần, và một tài liệu lệch tệ
hơn không có tài liệu: FE dựng xong màn hình rồi mới biết trường đó không tồn
tại.

Nên phần máy đọc được của tài liệu được **sinh** từ ứng dụng, và test này là
thứ ép người sửa mã phải sinh lại. Nó không kiểm nội dung tài liệu — nó kiểm
rằng tài liệu đang nằm trên đĩa đúng bằng thứ ứng dụng hiện tại sinh ra.
"""

from __future__ import annotations

import re
from pathlib import Path

from scripts.gen_api_docs import main


def test_generated_api_docs_are_up_to_date() -> None:
    assert main(["--check"]) == 0, (
        "docs/api/ đã lệch với mã nguồn. "
        "Chạy: cd src_BE && uv run python -m scripts.gen_api_docs"
    )


#: Liên kết markdown tương đối: `[chữ](đường/dẫn.md)` hoặc `(đường/dẫn.md#neo)`.
_LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")

DOCS = Path(__file__).resolve().parents[2] / "docs"


def _markdown_files() -> list[Path]:
    return [
        DOCS / "README.md",
        DOCS / "api-cho-frontend.md",
        *sorted((DOCS / "api").rglob("*.md")),
    ]


def test_every_relative_link_points_at_a_file_that_exists() -> None:
    """Liên kết gãy trong tài liệu API là cách mất người đọc ở đúng lúc họ cần.

    Tên tệp chi tiết sinh ra từ đường dẫn endpoint, nên đổi một đường dẫn sẽ đổi
    tên tệp và làm gãy mọi liên kết trỏ tới nó — gồm cả những liên kết viết tay
    trong phần ghi chú.
    """
    broken: list[str] = []
    for path in _markdown_files():
        for target in _LINK.findall(path.read_text()):
            if target.startswith(("http://", "https://", "#", "mailto:")):
                continue
            resolved = (path.parent / target.split("#", 1)[0]).resolve()
            if not resolved.exists():
                broken.append(f"{path.relative_to(DOCS)} → {target}")
    assert not broken, "Liên kết gãy trong tài liệu API:\n" + "\n".join(broken)
