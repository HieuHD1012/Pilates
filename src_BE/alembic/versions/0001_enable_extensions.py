"""Bật extension cần cho exclusion constraint chống trùng giờ HLV.

Phải chạy trước mọi bảng: `EXCLUDE USING gist (trainer_id WITH =, slot WITH &&)`
trộn một cột bằng nhau với một cột range, và GiST chỉ hiểu toán tử `=` trên
kiểu vô hướng khi có `btree_gist`.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS btree_gist")
