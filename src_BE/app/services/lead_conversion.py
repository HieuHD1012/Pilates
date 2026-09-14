"""Chuyển khách quan tâm thành học viên."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError, NotFoundError
from app.domain.rules import LeadStatus
from app.models.people import Lead, Student


def convert_lead_to_student(db: Session, lead_id: int) -> Student:
    """Tạo hồ sơ học viên từ một khách quan tâm.

    Bản ghi `lead` **được giữ nguyên** và chỉ gắn thêm `converted_student_id`:
    lịch sử tư vấn là thứ nhân viên cần đọc lại sau khi người đó đã thành học
    viên, nên xoá hay ghi đè nó là mất dữ liệu.
    """
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise NotFoundError("Không tìm thấy khách quan tâm.")

    if lead.converted_student_id is not None:
        raise BusinessError(
            "LEAD_ALREADY_CONVERTED",
            f"Khách này đã được chuyển thành học viên #{lead.converted_student_id}.",
        )

    existing = db.scalar(select(Student).where(Student.phone == lead.phone))
    if existing is not None:
        # Chỉ ra đúng hồ sơ đang giữ số đó, thay vì chỉ báo "trùng": nhân viên
        # cần mở hồ sơ đó ra xem chứ không cần biết mình đã sai.
        raise BusinessError(
            "STUDENT_PHONE_TAKEN",
            f"Số điện thoại {lead.phone} đã thuộc học viên "
            f"#{existing.id} ({existing.full_name}).",
        )

    student = Student(
        full_name=lead.full_name,
        phone=lead.phone,
        note=lead.need,
    )
    db.add(student)
    try:
        # SAVEPOINT: một va chạm UNIQUE ở đây không được huỷ phần còn lại của
        # transaction — service không sở hữu transaction của request.
        with db.begin_nested():
            db.flush()
    except IntegrityError as exc:
        # Hai nhân viên chuyển đổi cùng lúc: để ràng buộc UNIQUE phán quyết
        # thay vì để một người nhận 500.
        raise BusinessError(
            "STUDENT_PHONE_TAKEN",
            f"Số điện thoại {lead.phone} vừa được dùng cho một hồ sơ khác.",
        ) from exc

    lead.converted_student_id = student.id
    lead.status = LeadStatus.CONVERTED
    return student
