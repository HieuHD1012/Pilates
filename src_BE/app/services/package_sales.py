"""Bán gói, gia hạn và huỷ gói — mọi thao tác đều nguyên tử với sổ buổi.

Tách khỏi tầng API vì `scripts/import_initial_data.py` (F10) phải dùng lại
đúng đường này: nhập dữ liệu mà ghi thẳng số dư thay vì sinh bút toán mở sổ là
cách làm hai biểu diễn lệch nhau ngay từ ngày đầu chạy thật.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.domain.rules import ClassType, LedgerReason, PackageStatus, today
from app.models.money import PackageType, StudentPackage
from app.models.people import Student
from app.services import credit_ledger


@dataclass(frozen=True)
class PackageSpec:
    """Nội dung một gói tại thời điểm bán.

    Snapshot chứ không phải tham chiếu: sửa `package_type` về sau **không được**
    chạm gói học viên đã mua, nếu không thì đổi giá hôm nay sẽ viết lại lịch sử
    của mọi giao dịch hôm qua.
    """

    name: str
    price: Decimal
    credits: int
    class_type: ClassType
    start_date: date
    end_date: date


def spec_from_package_type(
    package_type: PackageType, start_date: date | None = None
) -> PackageSpec:
    start = start_date or today()
    return PackageSpec(
        name=package_type.name,
        price=package_type.price if package_type.price is not None else Decimal("0.00"),
        credits=package_type.credits,
        class_type=package_type.class_type,
        start_date=start,
        end_date=start + timedelta(days=package_type.duration_days),
    )


def sell_package(
    db: Session,
    *,
    student_id: int,
    spec: PackageSpec,
    actor_user_id: int,
    package_type_id: int | None = None,
    import_source: str | None = None,
    external_ref: str | None = None,
    opening_credits: int | None = None,
) -> StudentPackage:
    """Tạo gói cho học viên và cộng buổi — **một transaction, không tách rời**.

    Tách hai bước ra là để ngỏ khả năng có gói mà không có buổi, hoặc ngược
    lại; cả hai đều là hỏng dữ liệu mà không ràng buộc nào bắt được.

    **Buổi được cộng ngay khi tạo gói**, không đợi xác nhận thanh toán: nhân
    viên đứng quầy cần học viên tập được ngay, và đối soát tiền là việc khác.
    Đây là mặc định đang chờ khách chốt (`docs/business-rules.md`).

    `opening_credits` chỉ dùng cho nhập liệu ban đầu (F10): gói đã mua từ trước
    nhập vào kèm **số buổi còn lại**, và nó vào sổ dưới dạng một bút toán mở sổ
    chứ không phải một lần gán thẳng số dư.
    """
    if db.get(Student, student_id) is None:
        raise NotFoundError("Không tìm thấy học viên.")

    credits = spec.credits if opening_credits is None else opening_credits
    if credits <= 0:
        raise BusinessError("EMPTY_PACKAGE", "Gói phải có ít nhất một buổi.")
    if spec.end_date < spec.start_date:
        raise BusinessError("INVALID_PACKAGE_DATES", "Ngày kết thúc phải sau ngày bắt đầu.")

    package = StudentPackage(
        student_id=student_id,
        package_type_id=package_type_id,
        name_snapshot=spec.name,
        price_snapshot=spec.price,
        credits_snapshot=spec.credits,
        class_type_snapshot=spec.class_type,
        start_date=spec.start_date,
        end_date=spec.end_date,
        status=PackageStatus.ACTIVE,
        balance_cached=0,
        import_source=import_source,
        external_ref=external_ref,
    )
    db.add(package)
    db.flush()

    credit_ledger.record(
        db,
        student_package_id=package.id,
        delta=credits,
        reason=LedgerReason.PACKAGE_SOLD,
        actor_user_id=actor_user_id,
        note=f"Bán gói '{spec.name}'",
    )
    return package


def renew_package(
    db: Session,
    *,
    student_package_id: int,
    extra_days: int,
    extra_credits: int,
    actor_user_id: int,
    note: str | None = None,
) -> StudentPackage:
    """Gia hạn gói đang có: cộng thêm ngày và/hoặc buổi.

    Thêm ngày cập nhật end_date hiện tại, không cần lưu lịch sử ngày cũ.
    Thêm buổi nối bút toán PACKAGE_RENEWED vào sổ. Gói mới đi qua bán gói.
    """
    if extra_days < 0:
        raise BusinessError("INVALID_RENEWAL", "Số ngày gia hạn không được âm.")
    if extra_credits < 0:
        raise BusinessError("INVALID_RENEWAL", "Số buổi gia hạn không được âm.")
    if extra_days == 0 and extra_credits == 0:
        raise BusinessError("EMPTY_RENEWAL", "Gia hạn phải thêm ngày hoặc thêm buổi.")

    package = credit_ledger.lock_package(db, student_package_id)
    if package.status is not PackageStatus.ACTIVE:
        raise BusinessError(
            "PACKAGE_NOT_ACTIVE", "Chỉ gia hạn được gói đang ở trạng thái hoạt động."
        )

    if extra_days:
        # Gia hạn từ ngày hết hạn nếu gói còn hiệu lực, từ hôm nay nếu đã quá
        # hạn — cộng ngày vào một mốc đã trôi qua thì gói vẫn chết.
        base = max(package.end_date, today())
        package.end_date = base + timedelta(days=extra_days)

    if extra_credits:
        credit_ledger.record(
            db,
            student_package_id=package.id,
            delta=extra_credits,
            reason=LedgerReason.PACKAGE_RENEWED,
            actor_user_id=actor_user_id,
            note=note or f"Gia hạn thêm {extra_credits} buổi",
        )
    db.flush()
    return package


def adjust_credits(
    db: Session,
    *,
    student_package_id: int,
    delta: int,
    reason_note: str,
    actor_user_id: int,
) -> StudentPackage:
    """Điều chỉnh số buổi thủ công — **chỉ ADMIN**, bắt buộc lý do.

    Đây là van xả cho mọi ca đặc biệt: trả buổi vì studio đổi lịch, thu lại
    buổi cộng nhầm, xử lý một gói đã tiêu buổi mà tiền không về. Vì nó bỏ qua
    mọi quy tắc khác nên lý do và người thực hiện là bắt buộc, cưỡng chế ở cả
    tầng service lẫn CHECK constraint ở CSDL.
    """
    entry = credit_ledger.record(
        db,
        student_package_id=student_package_id,
        delta=delta,
        reason=LedgerReason.ADMIN_ADJUST,
        actor_user_id=actor_user_id,
        note=reason_note,
    )
    # `record` đã khoá và nạp lại gói; tra thêm lần nữa chỉ là một câu
    # `SELECT ... FOR UPDATE` thừa.
    return db.get(StudentPackage, entry.student_package_id)
