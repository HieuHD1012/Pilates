"""Ghi nhận, xác nhận và huỷ thanh toán.

Chỉ tiền mặt và chuyển khoản, do nhân viên ghi nhận — không có cổng thanh toán
online. Ba chuyển trạng thái, và **cả ba đều lưu người thực hiện lẫn thời
điểm**: một bản ghi tiền mà không truy được ai đổi nó thì không phải bản ghi.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.domain.rules import LedgerReason, PackageStatus, PaymentMethod, PaymentStatus, now
from app.models.money import CreditLedger, Payment, StudentPackage
from app.services import credit_ledger


def _get_payment(db: Session, payment_id: int) -> Payment:
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Không tìm thấy giao dịch thanh toán.")
    return payment


def record_payment(
    db: Session,
    *,
    student_package_id: int,
    amount: Decimal,
    method: PaymentMethod,
    actor_user_id: int,
    note: str | None = None,
) -> Payment:
    """Ghi nhận một khoản tiền ở trạng thái `PENDING`."""
    if amount < 0:
        raise BusinessError("INVALID_AMOUNT", "Số tiền không được âm.")
    if db.get(StudentPackage, student_package_id) is None:
        raise NotFoundError("Không tìm thấy gói tập.")

    payment = Payment(
        student_package_id=student_package_id,
        amount=amount,
        method=method,
        status=PaymentStatus.PENDING,
        note=note,
        recorded_by=actor_user_id,
        recorded_at=now(),
    )
    db.add(payment)
    db.flush()
    return payment


def confirm_payment(db: Session, *, payment_id: int, actor_user_id: int) -> Payment:
    """Xác nhận đã nhận tiền. Chỉ giao dịch `CONFIRMED` mới vào báo cáo doanh thu."""
    payment = _get_payment(db, payment_id)
    if payment.status is PaymentStatus.VOID:
        raise BusinessError(
            "PAYMENT_VOIDED", "Giao dịch đã huỷ thì không chuyển sang trạng thái khác được."
        )
    if payment.status is PaymentStatus.CONFIRMED:
        return payment

    payment.status = PaymentStatus.CONFIRMED
    payment.confirmed_by = actor_user_id
    payment.confirmed_at = now()
    db.flush()
    return payment


def void_payment(
    db: Session, *, payment_id: int, actor_user_id: int, reason: str
) -> Payment:
    """Huỷ một giao dịch.

    **Chặn `VOID` nếu gói đã tiêu buổi.** Kịch bản mà quy tắc này tồn tại để
    ngăn: học viên tập 6 buổi, ba tuần sau đối soát ngân hàng cho thấy tiền
    không về, nhân viên bấm `VOID` — doanh thu giảm, số buổi không đổi, và
    không ai phát hiện. Buổi đã tiêu là chuyện phải bàn với học viên, không
    được là hệ quả âm thầm của một lần đổi trạng thái.

    Gói **chưa tiêu buổi nào** thì huỷ được, kèm bút toán `PAYMENT_VOID` đối
    ứng thu hồi toàn bộ số buổi đã cộng, trong cùng transaction.
    """
    if not reason.strip():
        raise BusinessError("VOID_NEEDS_REASON", "Huỷ giao dịch bắt buộc phải có lý do.")

    payment = _get_payment(db, payment_id)
    if payment.status is PaymentStatus.VOID:
        raise BusinessError("PAYMENT_ALREADY_VOID", "Giao dịch này đã được huỷ.")

    package = credit_ledger.lock_package(db, payment.student_package_id)

    consumed = credit_ledger.has_consumed_credits(db, package.id)
    if consumed:
        raise BusinessError(
            "PACKAGE_HAS_CONSUMED_CREDITS",
            f"Gói '{package.name_snapshot}' đã tiêu {consumed} buổi nên không huỷ "
            "giao dịch được. Dùng điều chỉnh số buổi thủ công kèm lý do để xử lý.",
        )

    # Số buổi trên gói không gắn với từng khoản tiền, nên khi gói có nhiều giao
    # dịch thì "thu hồi buổi của đúng khoản này" là câu hỏi không có đáp án
    # trong dữ liệu. Từ chối và buộc con người quyết định.
    other_live_payments = db.scalars(
        select(Payment.id).where(
            Payment.student_package_id == package.id,
            Payment.id != payment.id,
            Payment.status != PaymentStatus.VOID,
        )
    ).all()
    if other_live_payments:
        raise BusinessError(
            "PACKAGE_HAS_OTHER_PAYMENTS",
            f"Gói '{package.name_snapshot}' còn giao dịch khác chưa huỷ "
            f"({', '.join(f'#{pid}' for pid in other_live_payments)}), nên không suy ra "
            "được số buổi thuộc riêng giao dịch này. Dùng điều chỉnh số buổi thủ công.",
        )

    # Cùng một lý lẽ, cho nguồn buổi **không phải giao dịch tiền**. Bảng
    # `payment` không nhìn thấy chúng: gia hạn và điều chỉnh tay không tạo dòng
    # thanh toán nào, gói nhập từ Excel mở sổ bằng số buổi còn lại.
    #
    # Không có phép kiểm này, huỷ một khoản tiền của lần bán đầu sẽ thu hồi cả
    # số buổi studio vừa gia hạn và số buổi studio tự bù cho học viên — mất tài
    # sản của người khác, không cảnh báo, và **phép đối soát vẫn báo sạch** vì
    # sổ vẫn cân.
    extra_sources = db.scalars(
        select(CreditLedger.reason_code)
        .where(
            CreditLedger.student_package_id == package.id,
            CreditLedger.delta > 0,
            CreditLedger.reason_code != LedgerReason.PACKAGE_SOLD,
        )
        .distinct()
    ).all()
    if extra_sources or package.import_source is not None:
        labels = ", ".join(sorted(reason.value for reason in extra_sources)) or "nhập liệu"
        raise BusinessError(
            "PACKAGE_HAS_CREDITS_FROM_OTHER_SOURCES",
            f"Gói '{package.name_snapshot}' còn buổi đến từ nguồn khác ({labels}), "
            "nên không suy ra được số buổi thuộc riêng giao dịch này. Dùng điều "
            "chỉnh số buổi thủ công kèm lý do.",
        )

    payment.status = PaymentStatus.VOID
    payment.voided_by = actor_user_id
    payment.voided_at = now()
    payment.void_reason = reason

    if package.balance_cached:
        credit_ledger.record(
            db,
            student_package_id=package.id,
            delta=-package.balance_cached,
            reason=LedgerReason.PAYMENT_VOID,
            actor_user_id=actor_user_id,
            note=f"Huỷ giao dịch #{payment.id}: {reason}",
        )

    # Gói không còn được trả tiền thì cũng không còn hiệu lực. Để `ACTIVE` với
    # số dư 0 sẽ khiến nó vẫn hiện trong danh sách gói của học viên.
    package.status = PackageStatus.CANCELLED
    db.flush()
    return payment
