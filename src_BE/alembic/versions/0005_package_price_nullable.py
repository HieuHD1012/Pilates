"""Cho `package_type.price` nhận NULL — "studio chưa cung cấp giá".

Quy tắc nội dung nói: hiện giá **khi studio cung cấp**, trạng thái rỗng có nhãn
khi chưa có; và số chưa có thì **để trống, không để 0**.

Với `price` NOT NULL, nhân viên không có cách nào diễn đạt "chưa có giá" — họ
buộc phải gõ một con số, và `0` là một con số nói sai. Nhánh trả `null` ở
endpoint công khai vì thế là mã chết, còn tiêu chí "trạng thái rỗng" thì không
thể đạt được bằng dữ liệu.

`CHECK` được viết lại thành `price IS NULL OR price >= 0`: vẫn cấm giá âm,
nhưng cho phép trạng thái "chưa biết".

Revision ID: 0005
Revises: 0004
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "package_type", "price", existing_type=sa.Numeric(12, 2), nullable=True
    )
    op.drop_constraint("ck_package_type_price_non_negative", "package_type", type_="check")
    op.create_check_constraint(
        "ck_package_type_price_non_negative",
        "package_type",
        "price IS NULL OR price >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_package_type_price_non_negative", "package_type", type_="check")
    op.execute("UPDATE package_type SET price = 0 WHERE price IS NULL")
    op.alter_column(
        "package_type", "price", existing_type=sa.Numeric(12, 2), nullable=False
    )
    op.create_check_constraint(
        "ck_package_type_price_non_negative", "package_type", "price >= 0"
    )
