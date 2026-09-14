"""Lịch lặp lại theo tuần.

Sinh ra các bản ghi `class_session` **cụ thể**, không lưu quy tắc rồi tính lúc
đọc: từng buổi cần sửa/hủy độc lập và cần gắn được đăng ký. Một quy tắc lặp
không gắn đăng ký vào đâu được.

Hai bước bắt buộc:

- **Xem trước** — liệt kê buổi sẽ tạo, đánh dấu buổi trùng giờ HLV, cho bỏ qua
  từng buổi. Tạo mù mười hai buổi rồi phát hiện buổi thứ bảy sai là việc nhân
  viên phải đi dọn tay.
- **Ghi all-or-nothing** — giữa lúc xem trước và lúc xác nhận, một nhân viên
  khác có thể tạo lớp xung đột. Nếu buổi thứ 7/12 vi phạm ràng buộc thì rollback
  toàn bộ và trả về danh sách xung đột để xem trước lại, chứ không để lại một
  nhóm `recurrence_id` ghi dở.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.domain.rules import TIMEZONE, ClassType, SessionStatus
from app.models.scheduling import ClassSession
from app.services import scheduling

#: Trần số buổi sinh một lần. Không phải quy tắc nghiệp vụ — chỉ là chặn một
#: lần gõ nhầm ngày kết thúc biến thành hàng nghìn bản ghi.
MAX_OCCURRENCES = 104


@dataclass(frozen=True)
class Occurrence:
    starts_at: datetime
    ends_at: datetime
    #: Vì sao buổi này không tạo được — `None` nghĩa là tạo được.
    conflict: str | None = None

    @property
    def is_available(self) -> bool:
        return self.conflict is None


@dataclass(frozen=True)
class RecurrencePreview:
    occurrences: list[Occurrence]

    @property
    def available(self) -> list[Occurrence]:
        return [item for item in self.occurrences if item.is_available]

    @property
    def conflicts(self) -> list[Occurrence]:
        return [item for item in self.occurrences if not item.is_available]


def _occurrence_dates(
    start_date: date, end_date: date, weekdays: set[int]
) -> list[date]:
    if end_date < start_date:
        raise BusinessError("INVALID_RANGE", "Ngày kết thúc phải sau ngày bắt đầu.")
    if not weekdays or not weekdays <= set(range(7)):
        raise BusinessError(
            "INVALID_WEEKDAYS", "Chọn ít nhất một thứ trong tuần (0 = thứ Hai)."
        )

    days = (end_date - start_date).days
    return [
        day
        for offset in range(days + 1)
        if (day := start_date + timedelta(days=offset)).weekday() in weekdays
    ]


def build_preview(
    db: Session,
    *,
    start_date: date,
    end_date: date,
    weekdays: set[int],
    start_time: time,
    duration_minutes: int,
    trainer_id: int,
) -> RecurrencePreview:
    """Liệt kê các buổi sẽ tạo, đánh dấu buổi HLV đã bận.

    Phép kiểm ở đây là **thông tin để nhân viên quyết định**, không phải lớp
    bảo vệ: giữa xem trước và xác nhận, một nhân viên khác vẫn có thể chiếm
    khung giờ. Lớp bảo vệ thật là ràng buộc `EXCLUDE` ở CSDL, chạy lúc ghi.
    """
    if duration_minutes <= 0:
        raise BusinessError("INVALID_DURATION", "Thời lượng buổi học phải lớn hơn 0.")
    # Cùng phép kiểm với `POST /classes`. Thiếu nó, lịch lặp lại trở thành đường
    # vòng qua quy tắc "HLV đã ngừng hoạt động".
    scheduling.assert_trainer_bookable(db, trainer_id)

    dates = _occurrence_dates(start_date, end_date, weekdays)
    if len(dates) > MAX_OCCURRENCES:
        raise BusinessError(
            "TOO_MANY_OCCURRENCES",
            f"Khoảng ngày này sinh ra {len(dates)} buổi, vượt trần {MAX_OCCURRENCES}. "
            "Hãy thu hẹp khoảng thời gian.",
        )

    occurrences: list[Occurrence] = []
    for day in dates:
        starts_at = datetime.combine(day, start_time, tzinfo=TIMEZONE)
        ends_at = starts_at + timedelta(minutes=duration_minutes)

        busy = db.scalar(
            select(ClassSession.id).where(
                ClassSession.trainer_id == trainer_id,
                ClassSession.status == SessionStatus.SCHEDULED,
                ClassSession.starts_at < ends_at,
                ClassSession.ends_at > starts_at,
            )
        )
        occurrences.append(
            Occurrence(
                starts_at=starts_at,
                ends_at=ends_at,
                conflict=(
                    f"HLV đã có lớp #{busy} trùng khung giờ này" if busy else None
                ),
            )
        )
    return RecurrencePreview(occurrences=occurrences)


def create_recurring_sessions(
    db: Session,
    *,
    occurrences: list[Occurrence],
    trainer_id: int,
    class_type: ClassType,
    capacity: int | None,
    actor_user_id: int,
) -> tuple[str, list[ClassSession]]:
    """Ghi cả nhóm buổi — **all-or-nothing**.

    Một buổi vỡ là cả nhóm rollback. Ghi được bao nhiêu hay bấy nhiêu sẽ để lại
    một `recurrence_id` dở dang mà nhân viên không nhìn ra là dở dang.
    """
    wanted = [item for item in occurrences if item.is_available]
    if not wanted:
        raise BusinessError("NO_OCCURRENCES", "Không có buổi nào để tạo.")

    scheduling.assert_trainer_bookable(db, trainer_id)

    recurrence_id = uuid.uuid4().hex[:36]
    created: list[ClassSession] = []
    resolved_capacity = scheduling.resolve_capacity(class_type, capacity)

    try:
        with db.begin_nested():
            for item in wanted:
                class_session = ClassSession(
                    starts_at=item.starts_at,
                    ends_at=item.ends_at,
                    trainer_id=trainer_id,
                    class_type=class_type,
                    capacity=resolved_capacity,
                    created_by=actor_user_id,
                    recurrence_id=recurrence_id,
                )
                db.add(class_session)
                created.append(class_session)
            db.flush()
    except IntegrityError as exc:
        # Chỉ dịch đúng vi phạm chống trùng giờ. Dịch mù mọi `IntegrityError`
        # thành "trùng giờ" sẽ khiến một khoá ngoại sai báo là xung đột lịch, và
        # nhân viên xem trước lại mãi mãi vì nguyên nhân thật nằm chỗ khác.
        scheduling.translate_overlap(exc)
        raise BusinessError(
            "RECURRENCE_CONFLICT",
            "Có buổi trong nhóm bị trùng giờ HLV nên không tạo được buổi nào. "
            "Hãy xem trước lại để thấy khung giờ đã bị chiếm.",
        ) from exc

    return recurrence_id, created
