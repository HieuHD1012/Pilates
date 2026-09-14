"""Cưỡng chế ở tầng CSDL cho sổ buổi.

Hai việc, cả hai đều không thể làm ở tầng ứng dụng:

1. `credit_ledger` từ chối UPDATE và DELETE. Sổ append-only mà chỉ "quy ước
   không sửa" thì một dòng ORM lỡ tay là mất lịch sử, âm thầm.
2. `balance_cached` luôn bằng `SUM(delta)` của gói, kiểm lúc COMMIT. Đây là
   thứ biến `balance_cached` thành biểu diễn thứ hai *độc lập*: bất kỳ đường
   nào ghi số dư mà không ghi bút toán tương ứng đều vỡ ở commit, nên quy tắc
   "chỉ `credit_ledger.py` được ghi" được máy giữ chứ không phải người nhớ.

Kiểm ở mức DEFERRED (cuối transaction) chứ không phải từng câu lệnh: trong một
transaction hợp lệ, dòng ledger và số dư được ghi ở hai câu lệnh khác nhau nên
trạng thái giữa chừng luôn lệch.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


APPEND_ONLY_FN = """
CREATE OR REPLACE FUNCTION credit_ledger_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION
        'credit_ledger la so append-only: khong duoc % dong %. Ghi but toan doi ung thay vi sua lich su.',
        TG_OP, COALESCE(OLD.id, -1)
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
"""

BALANCE_MATCHES_FN = """
CREATE OR REPLACE FUNCTION student_package_balance_matches_ledger() RETURNS trigger AS $$
DECLARE
    pkg_id bigint;
    ledger_sum bigint;
    cached bigint;
BEGIN
    -- IF/ELSE chứ không phải CASE: PL/pgSQL biên dịch cả hai nhánh của một
    -- biểu thức CASE, nên tham chiếu `NEW.student_package_id` sẽ vỡ khi trigger
    -- gắn vào `student_package` — bảng không có cột đó.
    IF TG_TABLE_NAME = 'credit_ledger' THEN
        pkg_id := NEW.student_package_id;
    ELSE
        pkg_id := NEW.id;
    END IF;

    SELECT COALESCE(SUM(delta), 0) INTO ledger_sum
      FROM credit_ledger WHERE student_package_id = pkg_id;

    SELECT balance_cached INTO cached
      FROM student_package WHERE id = pkg_id;

    -- Gói đã bị xoá trong cùng transaction thì không còn gì để đối chiếu.
    IF cached IS NULL THEN
        RETURN NULL;
    END IF;

    IF cached <> ledger_sum THEN
        RAISE EXCEPTION
            'balance_cached (%) lech SUM(delta) (%) o student_package %. So du chi duoc ghi qua credit_ledger.py, cung transaction voi dong ledger.',
            cached, ledger_sum, pkg_id
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
"""


def upgrade() -> None:
    op.execute(APPEND_ONLY_FN)
    op.execute(
        "CREATE TRIGGER trg_credit_ledger_no_update "
        "BEFORE UPDATE ON credit_ledger "
        "FOR EACH ROW EXECUTE FUNCTION credit_ledger_append_only()"
    )
    op.execute(
        "CREATE TRIGGER trg_credit_ledger_no_delete "
        "BEFORE DELETE ON credit_ledger "
        "FOR EACH ROW EXECUTE FUNCTION credit_ledger_append_only()"
    )

    op.execute(BALANCE_MATCHES_FN)
    op.execute(
        "CREATE CONSTRAINT TRIGGER trg_balance_matches_on_ledger "
        "AFTER INSERT ON credit_ledger "
        "DEFERRABLE INITIALLY DEFERRED "
        "FOR EACH ROW EXECUTE FUNCTION student_package_balance_matches_ledger()"
    )
    op.execute(
        "CREATE CONSTRAINT TRIGGER trg_balance_matches_on_package "
        "AFTER INSERT OR UPDATE OF balance_cached ON student_package "
        "DEFERRABLE INITIALLY DEFERRED "
        "FOR EACH ROW EXECUTE FUNCTION student_package_balance_matches_ledger()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_balance_matches_on_package ON student_package")
    op.execute("DROP TRIGGER IF EXISTS trg_balance_matches_on_ledger ON credit_ledger")
    op.execute("DROP FUNCTION IF EXISTS student_package_balance_matches_ledger()")
    op.execute("DROP TRIGGER IF EXISTS trg_credit_ledger_no_delete ON credit_ledger")
    op.execute("DROP TRIGGER IF EXISTS trg_credit_ledger_no_update ON credit_ledger")
    op.execute("DROP FUNCTION IF EXISTS credit_ledger_append_only()")
