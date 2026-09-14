"""Bịt bốn lỗ hổng ràng buộc phát hiện khi review F00/F01.

Chạy **trước khi F05 ghi sổ buổi thật**: sau đó mỗi thay đổi ở đây là một
ALTER trên dữ liệu đang chạy, mà `credit_ledger` thì append-only.

1. `btrim()` mặc định chỉ cắt **dấu cách**, nên `note = E'\\n'`, tab hay
   U+00A0 vẫn qua được CHECK "note khác rỗng" — điều chỉnh số buổi thủ công
   không lý do vẫn ghi được. Cùng lỗi ở `payment.void_reason`.
2. Hai partial unique index của `credit_ledger` khoá theo `booking_id`, mà
   NULL không bao giờ đụng unique. Một dòng `CANCEL_REFUND` thiếu `booking_id`
   vô hiệu hoá lớp chặn hoàn buổi hai lần, và không test nào thấy.
3. Trigger `FOR EACH ROW` không thấy `TRUNCATE`, nên sổ append-only vẫn xoá
   sạch được bằng một câu lệnh.
4. `waitlist_entry` có người huỷ nhưng không có thời điểm huỷ; `announcement`
   không truy được ai sửa lần cuối — trong khi đó là trường đi thẳng lên trang
   khách đọc.

Revision ID: 0004
Revises: 0003
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.models.base import requires_meaningful_text

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1 + 2 — ràng buộc sổ buổi.
    op.drop_constraint(
        "ck_credit_ledger_admin_adjust_needs_note", "credit_ledger", type_="check"
    )
    op.create_check_constraint(
        "ck_credit_ledger_admin_adjust_needs_note",
        "credit_ledger",
        f"reason_code <> 'ADMIN_ADJUST' OR ({requires_meaningful_text('note')})",
    )
    op.create_check_constraint(
        "ck_credit_ledger_booking_reason_needs_booking",
        "credit_ledger",
        "reason_code NOT IN ('BOOKING_DEDUCT', 'CANCEL_REFUND') OR booking_id IS NOT NULL",
    )

    op.drop_constraint("ck_payment_void_has_actor_and_reason", "payment", type_="check")
    op.create_check_constraint(
        "ck_payment_void_has_actor_and_reason",
        "payment",
        "status <> 'VOID' OR (voided_by IS NOT NULL AND voided_at IS NOT NULL "
        f"AND {requires_meaningful_text('void_reason')})",
    )

    # 3 — TRUNCATE cũng phải bị chặn.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION credit_ledger_no_truncate() RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION
                'credit_ledger la so append-only: khong duoc TRUNCATE.'
                USING ERRCODE = 'restrict_violation';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        "CREATE TRIGGER trg_credit_ledger_no_truncate "
        "BEFORE TRUNCATE ON credit_ledger "
        "FOR EACH STATEMENT EXECUTE FUNCTION credit_ledger_no_truncate()"
    )

    # 4 — dấu vết còn thiếu.
    op.add_column(
        "waitlist_entry", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "announcement", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("announcement", sa.Column("updated_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_announcement_updated_by",
        "announcement",
        "user_account",
        ["updated_by"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_announcement_updated_by", "announcement", type_="foreignkey")
    op.drop_column("announcement", "updated_by")
    op.drop_column("announcement", "updated_at")
    op.drop_column("waitlist_entry", "cancelled_at")

    op.execute("DROP TRIGGER IF EXISTS trg_credit_ledger_no_truncate ON credit_ledger")
    op.execute("DROP FUNCTION IF EXISTS credit_ledger_no_truncate()")

    op.drop_constraint("ck_payment_void_has_actor_and_reason", "payment", type_="check")
    op.create_check_constraint(
        "ck_payment_void_has_actor_and_reason",
        "payment",
        "status <> 'VOID' OR (voided_by IS NOT NULL AND voided_at IS NOT NULL "
        "AND btrim(coalesce(void_reason, '')) <> '')",
    )
    op.drop_constraint(
        "ck_credit_ledger_booking_reason_needs_booking", "credit_ledger", type_="check"
    )
    op.drop_constraint(
        "ck_credit_ledger_admin_adjust_needs_note", "credit_ledger", type_="check"
    )
    op.create_check_constraint(
        "ck_credit_ledger_admin_adjust_needs_note",
        "credit_ledger",
        "reason_code <> 'ADMIN_ADJUST' OR (note IS NOT NULL AND btrim(note) <> '')",
    )
