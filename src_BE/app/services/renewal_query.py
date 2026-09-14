"""Danh sách học viên cần liên hệ gia hạn.

**Không có job nền và không gửi tin tự động.** Dữ liệu một studio đủ nhỏ để
truy vấn trực tiếp, còn một job nền thêm một trạng thái phải đồng bộ mà không
đổi lại giá trị gì. Đây cũng là lý do `EXPIRY_FORFEIT` không tồn tại trong enum
lý do ghi sổ: không có chủ thể nào chạy để ghi nó.

Ngưỡng là **HOẶC, không phải VÀ**: còn ≤6 buổi *hoặc* ≤15 ngày. Người còn 20
buổi nhưng hết hạn sau 10 ngày vẫn cần gọi — hiểu thành VÀ là bỏ sót đúng nhóm
khách sắp mất.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.core.errors import NotFoundError
from app.domain.rules import RENEWAL_THRESHOLD, now, today
from app.models.money import StudentPackage
from app.models.people import RenewalContact, Student
from app.services.credit_balance import LEDGER_SUM, active_package_filter

#: Vì sao một gói lọt vào danh sách. Hai lý do độc lập, một gói có thể mang cả
#: hai — và giao diện cần nói rõ bằng chữ chứ không chỉ tô màu một con số.
REASON_LOW_CREDITS = "LOW_CREDITS"
REASON_EXPIRING_SOON = "EXPIRING_SOON"


@dataclass(frozen=True)
class RenewalCandidate:
    student_id: int
    student_name: str
    student_phone: str
    student_package_id: int
    package_name: str
    credits_remaining: int
    end_date: date
    days_remaining: int
    reasons: tuple[str, ...]
    last_contacted_at: datetime | None
    last_contact_result: str | None
    next_contact_date: date | None


@dataclass(frozen=True)
class RenewalSummary:
    """Đếm người, **không** đếm tiền.

    Bảng tổng hợp này nằm trên màn hình vận hành hằng ngày; số liệu kinh doanh
    không được xuất hiện ở đó.
    """

    needing_contact: int
    low_credits: int
    expiring_soon: int
    never_contacted: int


def _base_query(
    reference: date,
    *,
    max_credits: int | None = None,
    max_days: int | None = None,
    contacted: bool | None = None,
) -> Select:
    stmt = (
        select(
            Student.id,
            Student.full_name,
            Student.phone,
            StudentPackage.id,
            StudentPackage.name_snapshot,
            LEDGER_SUM.label("credits_remaining"),
            StudentPackage.end_date,
        )
        .join(Student, Student.id == StudentPackage.student_id)
    )
    stmt = active_package_filter(stmt, reference)
    # Mốc ngày tính sẵn trong Python theo **giờ studio**: để CSDL tự cộng
    # `CURRENT_DATE + 15` là để nó lấy ngày theo múi giờ của kết nối, và ở ngày
    # biên điều đó đẩy người ra/vào danh sách sai.
    stmt = stmt.where(
        or_(
            LEDGER_SUM <= RENEWAL_THRESHOLD["credits"],
            StudentPackage.end_date
            <= reference + timedelta(days=RENEWAL_THRESHOLD["days"]),
        )
    )

    # Bộ lọc phải nằm **trong** SQL, trước `LIMIT`. Lọc bằng Python sau khi đã
    # lấy 200 dòng đầu nghĩa là "còn ≤2 buổi" chỉ tìm trong 200 người đầu danh
    # sách chứ không phải trong toàn bộ — và người thứ 201 biến mất mà không ai
    # biết vì sao.
    if max_credits is not None:
        stmt = stmt.where(LEDGER_SUM <= max_credits)
    if max_days is not None:
        stmt = stmt.where(StudentPackage.end_date <= reference + timedelta(days=max_days))
    if contacted is not None:
        was_contacted = (
            select(RenewalContact.id)
            .where(RenewalContact.student_id == Student.id)
            .correlate(Student)
            .exists()
        )
        stmt = stmt.where(was_contacted if contacted else ~was_contacted)
    return stmt


def _reasons(credits_remaining: int, days_remaining: int) -> tuple[str, ...]:
    reasons = []
    if credits_remaining <= RENEWAL_THRESHOLD["credits"]:
        reasons.append(REASON_LOW_CREDITS)
    if days_remaining <= RENEWAL_THRESHOLD["days"]:
        reasons.append(REASON_EXPIRING_SOON)
    return tuple(reasons)


def _latest_contacts(
    db: Session, student_ids: set[int]
) -> dict[int, RenewalContact]:
    """Lần liên hệ gần nhất của mỗi học viên.

    Lịch sử là append-only nên "gần nhất" phải đọc ra, không ghi đè lên dòng cũ:
    studio cần biết đã gọi mấy lần chứ không chỉ lần cuối nói gì.
    """
    if not student_ids:
        return {}
    ranked = (
        select(
            RenewalContact,
            func.row_number()
            .over(
                partition_by=RenewalContact.student_id,
                order_by=[RenewalContact.contacted_at.desc(), RenewalContact.id.desc()],
            )
            .label("rank"),
        )
        .where(RenewalContact.student_id.in_(student_ids))
        .subquery()
    )
    latest = aliased(RenewalContact, ranked)
    return {
        item.student_id: item
        for item in db.scalars(select(latest).where(ranked.c.rank == 1))
    }


def candidates(
    db: Session,
    *,
    on_date: date | None = None,
    max_credits: int | None = None,
    max_days: int | None = None,
    contacted: bool | None = None,
    limit: int | None = 500,
) -> list[RenewalCandidate]:
    """Học viên cần liên hệ, kèm lý do và lần chăm sóc gần nhất.

    `max_credits`/`max_days` là bộ lọc **hẹp hơn** ngưỡng mặc định, dùng cho
    màn hình; chúng không nới rộng danh sách.
    """
    reference = on_date or today()
    stmt = _base_query(
        reference, max_credits=max_credits, max_days=max_days, contacted=contacted
    ).order_by(StudentPackage.end_date, LEDGER_SUM, StudentPackage.id)
    if limit is not None:
        stmt = stmt.limit(limit)
    rows = db.execute(stmt).all()

    latest = _latest_contacts(db, {row[0] for row in rows})
    results: list[RenewalCandidate] = []
    for (
        student_id,
        student_name,
        student_phone,
        package_id,
        package_name,
        credits_remaining,
        end_date,
    ) in rows:
        credits_remaining = int(credits_remaining)
        days_remaining = (end_date - reference).days
        contact = latest.get(student_id)
        results.append(
            RenewalCandidate(
                student_id=student_id,
                student_name=student_name,
                student_phone=student_phone,
                student_package_id=package_id,
                package_name=package_name,
                credits_remaining=credits_remaining,
                end_date=end_date,
                days_remaining=days_remaining,
                reasons=_reasons(credits_remaining, days_remaining),
                last_contacted_at=contact.contacted_at if contact else None,
                last_contact_result=contact.result if contact else None,
                next_contact_date=contact.next_contact_date if contact else None,
            )
        )
    return results


def summary(db: Session, on_date: date | None = None) -> RenewalSummary:
    """Bốn con số cho bảng tổng hợp, mỗi con số mở ra được danh sách sau nó.

    `limit=None` là cố ý: một con số tổng hợp bị chặn trần ở 500 sẽ **đứng yên**
    khi studio vượt mốc đó, và không gì báo. Ở quy mô một studio, tập này là vài
    trăm dòng.
    """
    rows = candidates(db, on_date=on_date, limit=None)
    return RenewalSummary(
        needing_contact=len(rows),
        low_credits=sum(1 for row in rows if REASON_LOW_CREDITS in row.reasons),
        expiring_soon=sum(1 for row in rows if REASON_EXPIRING_SOON in row.reasons),
        never_contacted=sum(1 for row in rows if row.last_contacted_at is None),
    )


def record_contact(
    db: Session,
    *,
    student_id: int,
    result: str,
    actor_user_id: int,
    next_contact_date: date | None = None,
    contacted_at: datetime | None = None,
) -> RenewalContact:
    """Ghi một lần chăm sóc. **Append**, không ghi đè dòng cũ."""
    if db.get(Student, student_id) is None:
        raise NotFoundError("Không tìm thấy học viên.")

    contact = RenewalContact(
        student_id=student_id,
        contacted_at=contacted_at or now(),
        result=result,
        next_contact_date=next_contact_date,
        actor_user_id=actor_user_id,
    )
    db.add(contact)
    db.flush()
    return contact


def contact_history(db: Session, student_id: int, limit: int = 50) -> list[RenewalContact]:
    return list(
        db.scalars(
            select(RenewalContact)
            .where(RenewalContact.student_id == student_id)
            .order_by(RenewalContact.contacted_at.desc(), RenewalContact.id.desc())
            .limit(limit)
        )
    )
