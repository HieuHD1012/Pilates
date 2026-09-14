"""Bảy bất biến của sổ buổi — mỗi mệnh đề **có thể fail**.

Vì sao bộ này tồn tại: một phép đối soát khẳng định "số dư = `SUM(delta)`"
trong khi số dư *được định nghĩa* là `SUM(delta)` thì đang so một đại lượng
với chính nó. Nó luôn xanh, kể cả trên một CSDL hỏng hoàn toàn — một lưới an
toàn giả, tệ hơn không có lưới.

`student_package.balance_cached` là biểu diễn thứ hai độc lập, và bảy mệnh đề
dưới đây là những điều **có thể sai** nếu hệ thống có lỗi.

Module này dùng chung cho `tests/test_ledger_invariants.py` (F05) và
`scripts/reconcile_ledger.py` (F10): script đối soát chạy trên PROD phải kiểm
đúng những mệnh đề mà test kiểm, không phải một bộ gần giống.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class InvariantViolation:
    code: str
    description: str
    #: Vài dòng ví dụ, đủ để người vận hành mở đúng bản ghi ra xem.
    samples: list[dict]
    total: int


@dataclass(frozen=True)
class Invariant:
    code: str
    description: str
    #: SQL trả về **các hàng vi phạm**. Không hàng nào nghĩa là mệnh đề đúng.
    violations_sql: str


#: Bút toán do đăng ký sinh ra. Tách riêng để mệnh đề #5 và #6 đọc được.
_BOOKING_REASONS = "('BOOKING_DEDUCT', 'CANCEL_REFUND')"

INVARIANTS: tuple[Invariant, ...] = (
    Invariant(
        "LEDGER_1_BALANCE_MATCHES_SUM",
        "balance_cached bằng SUM(delta) ở mọi gói",
        """
        SELECT sp.id AS student_package_id,
               sp.balance_cached,
               COALESCE(SUM(cl.delta), 0) AS ledger_sum
          FROM student_package sp
          LEFT JOIN credit_ledger cl ON cl.student_package_id = sp.id
         GROUP BY sp.id, sp.balance_cached
        HAVING sp.balance_cached <> COALESCE(SUM(cl.delta), 0)
        """,
    ),
    Invariant(
        "LEDGER_2_NO_NEGATIVE_BALANCE",
        "SUM(delta) không âm ở mọi gói",
        """
        SELECT sp.id AS student_package_id,
               COALESCE(SUM(cl.delta), 0) AS ledger_sum
          FROM student_package sp
          LEFT JOIN credit_ledger cl ON cl.student_package_id = sp.id
         GROUP BY sp.id
        HAVING COALESCE(SUM(cl.delta), 0) < 0
        """,
    ),
    Invariant(
        "LEDGER_3_ONE_DEDUCT_PER_ACTIVE_BOOKING",
        "mỗi lượt đăng ký đang hoạt động có đúng một BOOKING_DEDUCT, "
        "trỏ đúng gói của lượt đó",
        """
        SELECT b.id AS booking_id,
               b.student_package_id,
               COUNT(cl.id) AS deduct_count,
               COUNT(*) FILTER (
                   WHERE cl.student_package_id <> b.student_package_id
               ) AS wrong_package_count
          FROM booking b
          LEFT JOIN credit_ledger cl
                 ON cl.booking_id = b.id AND cl.reason_code = 'BOOKING_DEDUCT'
         WHERE b.status IN ('BOOKED', 'ATTENDED', 'NO_SHOW')
         GROUP BY b.id, b.student_package_id
        HAVING COUNT(cl.id) <> 1
            OR COUNT(*) FILTER (WHERE cl.student_package_id <> b.student_package_id) > 0
        """,
    ),
    Invariant(
        "LEDGER_4_AT_MOST_ONE_REFUND_PER_BOOKING",
        "mỗi lượt đăng ký có tối đa một CANCEL_REFUND",
        """
        SELECT booking_id, COUNT(*) AS refund_count
          FROM credit_ledger
         WHERE reason_code = 'CANCEL_REFUND' AND booking_id IS NOT NULL
         GROUP BY booking_id
        HAVING COUNT(*) > 1
        """,
    ),
    Invariant(
        "LEDGER_5_BOOKING_ENTRIES_HAVE_A_BOOKING",
        "mọi bút toán do đăng ký sinh ra đều trỏ tới một lượt đăng ký có thật, "
        "và ngược lại",
        f"""
        SELECT cl.id AS credit_ledger_id, cl.booking_id, cl.reason_code
          FROM credit_ledger cl
          LEFT JOIN booking b ON b.id = cl.booking_id
         WHERE cl.reason_code IN {_BOOKING_REASONS}
           AND (cl.booking_id IS NULL OR b.id IS NULL)
        UNION ALL
        SELECT NULL, b.id, 'MISSING_DEDUCT'
          FROM booking b
         WHERE b.status IN ('BOOKED', 'ATTENDED', 'NO_SHOW')
           AND NOT EXISTS (
               SELECT 1 FROM credit_ledger cl
                WHERE cl.booking_id = b.id AND cl.reason_code = 'BOOKING_DEDUCT'
           )
        """,
    ),
    Invariant(
        "LEDGER_6_CONSUMPTION_ENTRIES_ARE_NEGATIVE",
        "không bút toán tiêu buổi nào mang dấu dương "
        "(BOOKING_DEDUCT và PAYMENT_VOID chỉ được làm giảm số dư)",
        """
        SELECT cl.id AS credit_ledger_id,
               cl.student_package_id,
               cl.reason_code,
               cl.delta
          FROM credit_ledger cl
         WHERE cl.reason_code IN ('BOOKING_DEDUCT', 'PAYMENT_VOID')
           AND cl.delta > 0
        """,
    ),
    Invariant(
        "LEDGER_7_ENTRY_PACKAGE_BELONGS_TO_BOOKING_STUDENT",
        "gói của mọi bút toán thuộc đúng học viên của lượt đăng ký",
        """
        SELECT cl.id AS credit_ledger_id,
               cl.booking_id,
               cl.student_package_id,
               b.student_id AS booking_student_id,
               sp.student_id AS package_student_id
          FROM credit_ledger cl
          JOIN booking b ON b.id = cl.booking_id
          JOIN student_package sp ON sp.id = cl.student_package_id
         WHERE cl.booking_id IS NOT NULL
           AND sp.student_id <> b.student_id
        """,
    ),
)


def check_invariants(
    db: Session, sample_limit: int = 5
) -> list[InvariantViolation]:
    """Chạy cả bảy mệnh đề. Danh sách rỗng nghĩa là sổ sạch."""
    violations: list[InvariantViolation] = []
    for invariant in INVARIANTS:
        rows = db.execute(text(invariant.violations_sql)).mappings().all()
        if rows:
            violations.append(
                InvariantViolation(
                    code=invariant.code,
                    description=invariant.description,
                    samples=[dict(row) for row in rows[:sample_limit]],
                    total=len(rows),
                )
            )
    return violations


def assert_ledger_is_sound(db: Session) -> None:
    """Raise `AssertionError` kèm mô tả nếu bất kỳ mệnh đề nào sai."""
    violations = check_invariants(db)
    if violations:
        detail = "\n".join(
            f"- {item.code}: {item.description} ({item.total} bản ghi) — {item.samples}"
            for item in violations
        )
        raise AssertionError(f"Sổ buổi vi phạm bất biến:\n{detail}")


def invariant_codes() -> list[str]:
    return [invariant.code for invariant in INVARIANTS]


#: Ký hiệu kiểu cho nơi gọi muốn tự quyết cách báo lỗi.
InvariantReporter = Callable[[Session], list[InvariantViolation]]
