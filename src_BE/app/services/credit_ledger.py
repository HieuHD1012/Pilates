"""Cổng **duy nhất** ghi sổ buổi.

Không chỗ nào khác được `INSERT` vào `credit_ledger` hay gán
`student_package.balance_cached`. Một đường ghi vòng qua đây là một đường làm
lệch hai biểu diễn số dư, và nó lệch **âm thầm** — sổ vẫn cộng ra một con số,
chỉ là con số sai.

Quy tắc ở đây không phải quy ước: constraint trigger ở CSDL kiểm
`balance_cached = SUM(delta)` lúc COMMIT, nên mọi transaction ghi một vế mà
quên vế kia đều vỡ.

**Thứ tự khoá.** Hàm `record` luôn khoá `student_package` trước khi làm gì
khác. Đó là đầu của thứ tự khoá toàn cục (`student_package` → `class_session`),
nên mọi đường vào — bán gói, đăng ký, hủy, hủy lớp — tuân thủ thứ tự chỉ nhờ
việc gọi hàm này. Khoá lại một hàng transaction đang giữ là thao tác rỗng, nên
nơi gọi đã khoá sẵn (F07) cũng không bị ảnh hưởng.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.domain.rules import LedgerReason
from app.models.money import CreditLedger, StudentPackage

#: Bút toán bắt buộc có `booking_id` — cũng được CHECK ở CSDL cưỡng chế.
_BOOKING_REASONS = frozenset({LedgerReason.BOOKING_DEDUCT, LedgerReason.CANCEL_REFUND})


def lock_package(db: Session, student_package_id: int) -> StudentPackage:
    """Khoá một gói để ghi sổ. Đầu của thứ tự khoá toàn cục.

    `populate_existing` là phần bắt buộc, không phải tinh chỉnh. `FOR UPDATE`
    lấy đúng khoá và đọc đúng hàng, nhưng nếu session đã nạp gói này từ trước
    thì SQLAlchemy trả về **object cũ trong identity map** và bỏ qua giá trị vừa
    đọc. Khi đó `record()` cộng delta lên một `balance_cached` đã lỗi thời:
    khoá thì đúng, số thì sai.

    Điều này xảy ra thật ở luồng hủy lớp — nó đọc gói ở bước 1, rồi một
    transaction khác trừ buổi và commit, rồi bước 4 ghi bút toán hoàn.

    `flush()` trước là phần đi kèm bắt buộc: session của ứng dụng tắt autoflush,
    nên thay đổi chưa ghi (ví dụ `end_date` mới của một lần gia hạn) vẫn nằm
    trong bộ nhớ, và `populate_existing` sẽ nạp đè lên chúng bằng giá trị cũ
    dưới CSDL. Ghi xuống trước rồi mới nạp lại thì không mất gì.
    """
    db.flush()
    package = db.scalar(
        select(StudentPackage)
        .where(StudentPackage.id == student_package_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if package is None:
        raise NotFoundError("Không tìm thấy gói tập.")
    return package


def lock_packages(db: Session, student_package_ids: Sequence[int]) -> list[StudentPackage]:
    """Khoá nhiều gói **theo `id` tăng dần**.

    Thứ tự cố định là thứ duy nhất ngăn hai lần hủy lớp chạy song song khoá
    chéo nhau rồi cùng đứng chờ. Dùng ở luồng hủy lớp (F06), nơi một thao tác
    phải hoàn buổi vào nhiều gói cùng lúc.
    """
    if not student_package_ids:
        return []
    db.flush()
    return list(
        db.scalars(
            select(StudentPackage)
            .where(StudentPackage.id.in_(set(student_package_ids)))
            .order_by(StudentPackage.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )


def balance_of(db: Session, student_package_id: int) -> int:
    """Số dư của một gói, tính từ sổ."""
    return int(
        db.scalar(
            select(func.coalesce(func.sum(CreditLedger.delta), 0)).where(
                CreditLedger.student_package_id == student_package_id
            )
        )
        or 0
    )


def has_consumed_credits(db: Session, student_package_id: int) -> int:
    """Số buổi đã tiêu của một gói (tổng các lần trừ do đăng ký).

    Dùng để quyết định `VOID` thanh toán có được phép không: buổi đã tiêu là
    chuyện phải bàn với học viên, không được là hệ quả âm thầm của một lần đổi
    trạng thái thanh toán.
    """
    consumed = db.scalar(
        select(func.coalesce(func.sum(CreditLedger.delta), 0)).where(
            CreditLedger.student_package_id == student_package_id,
            CreditLedger.reason_code == LedgerReason.BOOKING_DEDUCT,
        )
    )
    return abs(int(consumed or 0))


def record(
    db: Session,
    *,
    student_package_id: int,
    delta: int,
    reason: LedgerReason,
    actor_user_id: int,
    note: str | None = None,
    booking_id: int | None = None,
) -> CreditLedger:
    """Ghi một bút toán và cập nhật số dư — **trong cùng transaction**.

    Trả về dòng ledger đã flush. Không commit: transaction thuộc về nơi gọi,
    và gộp bán gói + ghi sổ vào một đơn vị nguyên tử là điểm chính của thiết kế
    này.
    """
    if delta == 0:
        raise BusinessError("ZERO_DELTA", "Bút toán phải làm thay đổi số buổi.")

    if reason is LedgerReason.ADMIN_ADJUST and not (note or "").strip():
        raise BusinessError(
            "ADJUST_NEEDS_REASON", "Điều chỉnh số buổi thủ công bắt buộc phải có lý do."
        )

    if reason in _BOOKING_REASONS and booking_id is None:
        raise BusinessError(
            "MISSING_BOOKING_REF",
            f"Bút toán {reason.value} phải gắn với một lượt đăng ký.",
        )

    package = lock_package(db, student_package_id)

    new_balance = package.balance_cached + delta
    if new_balance < 0:
        raise BusinessError(
            "INSUFFICIENT_CREDITS",
            f"Gói '{package.name_snapshot}' chỉ còn {package.balance_cached} buổi, "
            f"không đủ để trừ {abs(delta)} buổi.",
        )

    entry = CreditLedger(
        student_package_id=package.id,
        delta=delta,
        reason_code=reason,
        note=note,
        booking_id=booking_id,
        actor_user_id=actor_user_id,
    )
    db.add(entry)
    # Hai vế của cùng một sự kiện. Tách chúng ra hai nơi là tách ra hai cơ hội
    # để một vế được ghi còn vế kia thì không.
    package.balance_cached = new_balance
    db.flush()
    return entry


def running_balance(db: Session, student_package_id: int) -> list[tuple[CreditLedger, int]]:
    """Các dòng sổ kèm **số dư sau mỗi dòng**.

    Màn sổ buổi tồn tại để một điều kiểm chứng được: đọc xuôi xuống, cộng dồn
    các thay đổi thì ra đúng số dư cuối. Tính số dư luỹ kế ở đây, bằng cửa sổ
    trượt của CSDL, thay vì để giao diện tự cộng — giao diện cộng thì nó đang
    khẳng định một điều nó không đọc được từ dữ liệu.
    """
    rows = db.execute(
        select(
            CreditLedger,
            func.sum(CreditLedger.delta).over(order_by=[CreditLedger.id]).label("balance"),
        )
        .where(CreditLedger.student_package_id == student_package_id)
        .order_by(CreditLedger.id)
    ).all()
    return [(entry, int(balance)) for entry, balance in rows]
