"""Số buổi còn lại — nguồn duy nhất cho mọi chỗ hiển thị.

Cố ý tính từ `SUM(credit_ledger.delta)` chứ **không** đọc
`student_package.balance_cached`, dù hai giá trị luôn bằng nhau nhờ constraint
trigger.

Lý do: `balance_cached` tồn tại để làm biểu diễn thứ hai *độc lập*. Nếu màn
hình cũng đọc nó thì hai biểu diễn hợp lại làm một, và một sai lệch — nếu bằng
cách nào đó xảy ra — sẽ hiển thị đúng bằng chính giá trị sai. Tính từ sổ nghĩa
là màn hình luôn đứng cùng phía với lịch sử, còn `balance_cached` đứng riêng
làm chốt chặn ở CSDL.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.domain.rules import RENEWAL_THRESHOLD, ClassType, PackageStatus, today
from app.models.money import CreditLedger, StudentPackage


@dataclass(frozen=True)
class PackageBalance:
    package: StudentPackage
    credits_remaining: int

    @property
    def days_remaining(self) -> int:
        return (self.package.end_date - today()).days

    @property
    def needs_renewal(self) -> bool:
        """Còn ≤6 buổi **HOẶC** ≤15 ngày.

        Quan hệ là HOẶC, không phải VÀ: người còn 20 buổi nhưng hết hạn sau 10
        ngày vẫn cần liên hệ gia hạn.
        """
        return (
            self.credits_remaining <= RENEWAL_THRESHOLD["credits"]
            or self.days_remaining <= RENEWAL_THRESHOLD["days"]
        )


#: Biểu thức số dư của một gói, ghép được vào truy vấn lớn hơn.
#:
#: Công khai chứ không riêng tư: `renewal_query` và `report_queries` cần đúng
#: phép cộng này bên trong truy vấn của chúng. Viết lại ở mỗi nơi là cách hai
#: màn hình cùng nói về "số buổi còn lại" mà cho hai con số.
LEDGER_SUM = (
    select(func.coalesce(func.sum(CreditLedger.delta), 0))
    .where(CreditLedger.student_package_id == StudentPackage.id)
    .correlate(StudentPackage)
    .scalar_subquery()
)


def active_package_filter(stmt: Select, on_date: date | None = None) -> Select:
    """Thu hẹp truy vấn `StudentPackage` về **gói đang hoạt động**.

    Định nghĩa (F00, dùng chung ở F03/F05/F08/F09):
    `status = ACTIVE` **và** `start_date <= hôm nay <= end_date` **và**
    `SUM(delta) > 0`.

    "Hôm nay" theo giờ studio — lấy theo giờ container thì ngưỡng ngày sẽ lệch
    7 giờ và đẩy người ra/vào danh sách sai ở đúng ngày biên.
    """
    reference = on_date or today()
    return stmt.where(
        StudentPackage.status == PackageStatus.ACTIVE,
        StudentPackage.start_date <= reference,
        StudentPackage.end_date >= reference,
        LEDGER_SUM > 0,
    )


def active_packages(
    db: Session,
    student_id: int,
    class_type: ClassType | None = None,
    *,
    on_date: date | None = None,
) -> list[PackageBalance]:
    """Các gói đang hoạt động của một học viên, kèm số buổi còn lại.

    Sắp theo `end_date` rồi `id` — đúng thứ tự của quy tắc chọn gói khi đặt lớp,
    nên F07 dùng lại được phần tử đầu tiên thay vì khai lại quy tắc.
    on_date bổ sung yêu cầu gói còn hạn ngày học, bên cạnh hiệu lực hôm nay.
    """
    stmt = select(StudentPackage, LEDGER_SUM.label("credits_remaining")).where(
        StudentPackage.student_id == student_id
    )
    if class_type is not None:
        stmt = stmt.where(StudentPackage.class_type_snapshot == class_type)
    stmt = active_package_filter(stmt)
    if on_date is not None:
        # Chỉ thêm **điều kiện ngày**, không gọi lại `active_package_filter`:
        # `status` và `SUM(delta) > 0` không phụ thuộc ngày nào đang xét, nên
        # lượt thứ hai chỉ nhân đôi chúng trong WHERE — kể cả subquery tương
        # quan cộng sổ.
        stmt = stmt.where(
            StudentPackage.start_date <= on_date,
            StudentPackage.end_date >= on_date,
        )
    stmt = stmt.order_by(StudentPackage.end_date, StudentPackage.id)
    return [
        PackageBalance(package=package, credits_remaining=int(remaining))
        for package, remaining in db.execute(stmt).all()
    ]


def student_credit_balance(db: Session, student_id: int) -> int:
    """Tổng số buổi còn dùng được của một học viên.

    **Chỉ gói đang hoạt động.** Gói hết hạn còn buổi chưa dùng không bị thu hồi
    (chính sách ở F00) nhưng không vào con số này — nếu tính cả, tiêu chí "số
    buổi hiển thị chính xác" sẽ sai một cách âm thầm.
    """
    return sum(item.credits_remaining for item in active_packages(db, student_id))


def package_ledger_total(db: Session, student_package_id: int) -> int:
    """Số dư của đúng một gói, không quan tâm gói còn hiệu lực hay không."""
    return int(
        db.scalar(
            select(func.coalesce(func.sum(CreditLedger.delta), 0)).where(
                CreditLedger.student_package_id == student_package_id
            )
        )
        or 0
    )


def all_packages(db: Session, student_id: int) -> list[PackageBalance]:
    """Mọi gói của học viên kèm số buổi còn lại, kể cả gói đã hết hạn.

    Dùng để **giải thích vì sao không đặt được lớp**: "hết buổi", "hết hạn",
    "sai loại gói" và "chưa có gói nào" là bốn tình huống khác nhau, và câu
    truy vấn chỉ lấy gói đang hoạt động không phân biệt được chúng — nó trả về
    rỗng ở cả bốn.
    """
    stmt = (
        select(StudentPackage, LEDGER_SUM.label("credits_remaining"))
        .where(StudentPackage.student_id == student_id)
        .order_by(StudentPackage.end_date, StudentPackage.id)
    )
    return [
        PackageBalance(package=package, credits_remaining=int(remaining))
        for package, remaining in db.execute(stmt).all()
    ]
