"""Nhập dữ liệu ban đầu từ file Excel của studio — **chạy lại được nhiều lần**.

    uv run python -m scripts.import_initial_data \
        --file du-lieu.xlsx --source studio-2026-11
    uv run python -m scripts.import_initial_data \
        --file du-lieu.xlsx --source studio-2026-11 --commit

Không có `--commit` thì mọi thứ chạy thật rồi **rollback**: số liệu báo cáo là
số liệu thật, kể cả các vi phạm ràng buộc, chứ không phải một phép đếm suông.

Vì sao tính chạy-lại-được là bắt buộc, không phải tiện nghi. Kịch bản đã thấy
trước: 12/11 trên PROD, dòng 340/500 lỗi vì một số điện thoại thừa khoảng
trắng đụng `UNIQUE`; tiến trình chết; người vận hành sửa file rồi chạy lại cả
file. 339 dòng đầu vào lần hai, **mỗi gói sinh thêm một `PACKAGE_SOLD` và số dư
nhân đôi**. Sổ buổi append-only nên gỡ ra phải ghi 339 bút toán đối ứng bằng
tay — trong tuần nghiệm thu.

Ba lớp chặn:

1. Mỗi dòng mang **khoá ngoài ổn định** từ file nguồn; `UNIQUE(import_source,
   external_ref)` trên `student`, `student_package`, `class_session` là phán
   quyết cuối, không phải phép kiểm ở tầng script.
2. **Một transaction cho cả file.** Không có trạng thái "nhập dở dang".
3. Gói đã mua nhập kèm **số buổi còn lại** và đi vào sổ bằng một bút toán mở
   sổ, không phải một lần gán thẳng `balance_cached`. Ghi thẳng số dư là cách
   hai biểu diễn lệch nhau ngay từ ngày đầu chạy thật.

Sau khi nhập, script tự đối chiếu `SUM(delta)` của mỗi gói với **con số ghi
trong file Excel** — không chỉ với chính nó — rồi chạy bảy mệnh đề đối soát.

Tài khoản cho người được nhập tạo ở trạng thái `PENDING_ACTIVATION`, **không
mật khẩu**. Không bao giờ sinh mật khẩu suy ra được từ số điện thoại: số điện
thoại lộ qua form tư vấn và danh bạ studio.

Bố cục file Excel (tên sheet và tên cột ở hàng đầu):

    hoc_vien   : ma_hoc_vien, ho_ten, so_dien_thoai, email, ghi_chu
    hlv        : ho_ten, so_dien_thoai, email
    goi_tap    : ma_goi, ma_hoc_vien, ten_goi, loai_lop, so_buoi_con_lai,
                 ngay_bat_dau, ngay_het_han, gia, [so_buoi_ban_dau]
    lich_lop   : ma_lop, ten_hlv, bat_dau, ket_thuc, loai_lop, suc_chua
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.db import SessionLocal
from app.domain.rules import (
    TIMEZONE,
    ClassType,
    Role,
    UserStatus,
    normalize_phone,
)
from app.models.money import StudentPackage
from app.models.people import Student, Trainer
from app.models.scheduling import ClassSession, ImportRun
from app.models.user import User
from app.services import credit_ledger
from app.services.ledger_invariants import check_invariants
from app.services.package_sales import PackageSpec, sell_package


@dataclass
class ImportReport:
    students_created: int = 0
    students_skipped: int = 0
    trainers_created: int = 0
    trainers_skipped: int = 0
    packages_created: int = 0
    packages_skipped: int = 0
    sessions_created: int = 0
    sessions_skipped: int = 0
    problems: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "students": {"created": self.students_created, "skipped": self.students_skipped},
            "trainers": {"created": self.trainers_created, "skipped": self.trainers_skipped},
            "packages": {"created": self.packages_created, "skipped": self.packages_skipped},
            "sessions": {"created": self.sessions_created, "skipped": self.sessions_skipped},
            "problems": self.problems,
        }


# --- Đọc file ----------------------------------------------------------------


def _rows(workbook, sheet_name: str) -> list[dict]:
    """Các dòng của một sheet dưới dạng dict, khoá là tên cột ở hàng đầu."""
    if sheet_name not in workbook.sheetnames:
        return []
    sheet = workbook[sheet_name]
    rows = sheet.iter_rows(values_only=True)
    try:
        header = [str(cell).strip() if cell is not None else "" for cell in next(rows)]
    except StopIteration:
        return []
    return [
        {key: value for key, value in zip(header, values, strict=False) if key}
        for values in rows
        if any(value is not None and str(value).strip() for value in values)
    ]


def _text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _as_date(value: object, *, field_name: str, row_ref: str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = _text(value)
    if text:
        try:
            return date.fromisoformat(text)
        except ValueError:
            pass
    raise ValueError(f"{row_ref}: cột '{field_name}' không phải ngày hợp lệ ({value!r}).")


def _as_datetime(value: object, *, field_name: str, row_ref: str) -> datetime:
    """Giờ trong file Excel là **giờ studio**, không phải UTC.

    File do nhân viên gõ tay ở Nha Trang; đọc nó như UTC là dời cả lịch lớp đi
    7 tiếng, và không ràng buộc nào phản đối vì 07:00 vẫn là một giờ hợp lệ.
    """
    if isinstance(value, datetime):
        return value.replace(tzinfo=TIMEZONE) if value.tzinfo is None else value
    text = _text(value)
    if text:
        try:
            parsed = datetime.fromisoformat(text)
            return parsed.replace(tzinfo=TIMEZONE) if parsed.tzinfo is None else parsed
        except ValueError:
            pass
    raise ValueError(f"{row_ref}: cột '{field_name}' không phải thời điểm hợp lệ ({value!r}).")


def _as_int(value: object, *, field_name: str, row_ref: str) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        raise ValueError(
            f"{row_ref}: cột '{field_name}' không phải số nguyên ({value!r})."
        ) from None


def _as_decimal(value: object) -> Decimal:
    try:
        return Decimal(str(value).strip())
    except (TypeError, InvalidOperation):
        return Decimal("0.00")


def _as_class_type(value: object, *, row_ref: str) -> ClassType:
    text = (_text(value) or "").upper()
    if text not in ClassType.__members__:
        raise ValueError(f"{row_ref}: loại lớp phải là GROUP hoặc PRIVATE ({value!r}).")
    return ClassType[text]


# --- Nhập từng loại ----------------------------------------------------------


#: Ràng buộc `UNIQUE` hay gặp nhất khi studio gõ tay, kèm câu giải thích cho
#: người vận hành. Không có bảng này thì dòng `problems` chỉ là tên index.
_CONSTRAINT_HINTS = {
    "student_phone_key": "số điện thoại đã thuộc về một học viên khác",
    "student_user_id_key": "email này đã gắn với một học viên khác",
    "user_account_email_key": "email đã có tài khoản",
    "uq_student_import_ref": "mã học viên bị lặp trong file",
    "uq_student_package_import_ref": "mã gói bị lặp trong file",
    "uq_class_session_import_ref": "mã lớp bị lặp trong file",
    "ex_class_session_trainer_no_overlap": "HLV đã có lớp khác trùng khung giờ",
}


def _explain(exc: IntegrityError) -> str:
    text = str(getattr(exc, "orig", exc))
    for name, hint in _CONSTRAINT_HINTS.items():
        if name in text:
            return hint
    return text.splitlines()[0]


def _add_row(db: Session, entity: object, *, report: ImportReport, row_ref: str) -> bool:
    """Ghi một dòng trong **savepoint riêng**. Hỏng thì bỏ dòng, không bỏ file.

    Không có lớp này, một va chạm `UNIQUE` ở dòng 340/500 ném exception ra khỏi
    cả lần chạy: người vận hành nhìn thấy traceback Python, không biết dòng nào
    hỏng, và không dòng `problems` nào được ghi. Đúng kiểu hỏng mà toàn bộ thiết
    kế chạy-lại-được sinh ra để ngăn.

    `expunge` sau khi lùi savepoint là bắt buộc: lùi savepoint trả đối tượng về
    trạng thái *pending*, nên lần `flush()` sau của dòng khác sẽ thử ghi lại nó
    và vấp đúng ràng buộc đó lần nữa.
    """
    try:
        with db.begin_nested():
            # `add` phải nằm **trong** savepoint. Thêm đối tượng trước rồi mới
            # mở savepoint thì lúc lùi, đối tượng vẫn nằm chờ trong session và
            # lần `flush()` của dòng sau sẽ ghi lại nó, vấp đúng ràng buộc đó
            # lần nữa — lần này ở một dòng hoàn toàn vô can.
            db.add(entity)
            db.flush()
    except IntegrityError as exc:
        report.problems.append(f"{row_ref}: {_explain(exc)}.")
        return False
    return True


def _account_for(
    db: Session,
    *,
    email: str | None,
    full_name: str,
    role: Role,
    phone: str | None,
    report: ImportReport,
    row_ref: str,
) -> User | None:
    """Tài khoản cho người được nhập — `PENDING_ACTIVATION`, **không mật khẩu**.

    Không có email thì không có tài khoản: hồ sơ vẫn nhập được và nhân viên
    thêm email sau. Bịa một email suy ra từ tên hoặc số điện thoại là tạo ra
    một địa chỉ không ai kiểm soát được, rồi gửi link đặt mật khẩu tới đó.
    """
    if not email:
        return None
    normalized = email.lower()
    existing = db.scalar(select(User).where(User.email == normalized))
    if existing is not None:
        return existing
    user = User(
        email=normalized,
        full_name=full_name,
        phone=phone,
        role=role,
        status=UserStatus.PENDING_ACTIVATION,
        password_hash=None,
    )
    if not _add_row(db, user, report=report, row_ref=row_ref):
        return None
    return user


def _link_account(
    db: Session,
    *,
    owner: Student | Trainer,
    others: object,
    email: str | None,
    full_name: str,
    role: Role,
    phone: str | None,
    report: ImportReport,
    row_ref: str,
    noun: str,
) -> None:
    """Nối một tài khoản vào hồ sơ vừa nhập, nếu file có khai email.

    `user_id` là `UNIQUE` trên cả `student` lẫn `trainer`. Hai người thật dùng
    chung một email — mẹ và con là chuyện thường ở studio Việt Nam — thì người
    thứ hai vẫn được nhập, chỉ là chưa có tài khoản. Bỏ luôn cả dòng vì lý do
    đó là mất một người có thật khỏi hệ thống.
    """
    user = _account_for(
        db,
        email=email,
        full_name=full_name,
        role=role,
        phone=phone,
        report=report,
        row_ref=row_ref,
    )
    if user is None:
        return

    taken = db.scalar(others.where(type(owner).user_id == user.id))
    if taken is not None:
        report.problems.append(
            f"{row_ref}: email đã gắn với {noun} #{taken}, "
            "dòng này được nhập nhưng chưa có tài khoản."
        )
        return

    owner.user_id = user.id
    try:
        with db.begin_nested():
            db.flush()
    except IntegrityError as exc:
        owner.user_id = None
        report.problems.append(f"{row_ref}: {_explain(exc)}.")


def _import_students(
    db: Session, rows: list[dict], source: str, report: ImportReport
) -> dict[str, Student]:
    result: dict[str, Student] = {}
    for index, row in enumerate(rows, start=2):
        row_ref = f"hoc_vien!{index}"
        external_ref = _text(row.get("ma_hoc_vien"))
        full_name = _text(row.get("ho_ten"))
        phone = _text(row.get("so_dien_thoai"))
        if not external_ref or not full_name or not phone:
            report.problems.append(f"{row_ref}: thiếu mã học viên, họ tên hoặc số điện thoại.")
            continue

        existing = db.scalar(
            select(Student).where(
                Student.import_source == source, Student.external_ref == external_ref
            )
        )
        if existing is not None:
            result[external_ref] = existing
            report.students_skipped += 1
            continue

        # Chuẩn hoá **trước** khi ghi: `0900 000 055` và `0900000055` là cùng
        # một người, và chính khoảng trắng thừa là thứ làm lần chạy đầu chết
        # giữa chừng ở kịch bản đã lường trước.
        student = Student(
            full_name=full_name,
            phone=normalize_phone(phone),
            email=_text(row.get("email")),
            note=_text(row.get("ghi_chu")),
            import_source=source,
            external_ref=external_ref,
        )
        # Ghi dòng người **trước**, tài khoản sau: dòng hỏng vì trùng số điện
        # thoại thì không để lại một tài khoản mồ côi của người không tồn tại.
        if not _add_row(db, student, report=report, row_ref=row_ref):
            continue

        _link_account(
            db,
            owner=student,
            others=select(Student.id).where(Student.user_id.is_not(None)),
            email=_text(row.get("email")),
            full_name=full_name,
            role=Role.STUDENT,
            phone=normalize_phone(phone),
            report=report,
            row_ref=row_ref,
            noun="học viên",
        )
        result[external_ref] = student
        report.students_created += 1
    return result


def _import_trainers(
    db: Session, rows: list[dict], report: ImportReport
) -> dict[str, Trainer]:
    """HLV nhận diện theo **họ tên**.

    `trainer` không có cột khoá ngoài như ba bảng kia, và một studio một cơ sở
    có chưa tới mười HLV nên trùng tên là chuyện phát hiện được bằng mắt. Ghi
    rõ ở đây vì nó là ngoại lệ duy nhất của quy tắc "khoá ngoài ổn định".
    """
    result: dict[str, Trainer] = {}
    for index, row in enumerate(rows, start=2):
        row_ref = f"hlv!{index}"
        full_name = _text(row.get("ho_ten"))
        if not full_name:
            report.problems.append(f"{row_ref}: thiếu họ tên.")
            continue

        existing = db.scalar(select(Trainer).where(Trainer.full_name == full_name))
        if existing is not None:
            result[full_name] = existing
            report.trainers_skipped += 1
            continue

        phone = _text(row.get("so_dien_thoai"))
        trainer = Trainer(
            full_name=full_name,
            phone=normalize_phone(phone) if phone else None,
        )
        if not _add_row(db, trainer, report=report, row_ref=row_ref):
            continue

        _link_account(
            db,
            owner=trainer,
            others=select(Trainer.id).where(Trainer.user_id.is_not(None)),
            email=_text(row.get("email")),
            full_name=full_name,
            role=Role.TRAINER,
            phone=trainer.phone,
            report=report,
            row_ref=row_ref,
            noun="HLV",
        )
        result[full_name] = trainer
        report.trainers_created += 1
    return result


@dataclass(frozen=True)
class ExpectedBalance:
    external_ref: str
    student_package_id: int
    credits_from_file: int


def _import_packages(
    db: Session,
    rows: list[dict],
    source: str,
    students: dict[str, Student],
    actor_user_id: int,
    report: ImportReport,
) -> list[ExpectedBalance]:
    expected: list[ExpectedBalance] = []
    for index, row in enumerate(rows, start=2):
        row_ref = f"goi_tap!{index}"
        external_ref = _text(row.get("ma_goi"))
        student_ref = _text(row.get("ma_hoc_vien"))
        if not external_ref or not student_ref:
            report.problems.append(f"{row_ref}: thiếu mã gói hoặc mã học viên.")
            continue

        existing = db.scalar(
            select(StudentPackage).where(
                StudentPackage.import_source == source,
                StudentPackage.external_ref == external_ref,
            )
        )
        if existing is not None:
            # Đây là chỗ tính chạy-lại-được thật sự sống: bỏ qua gói đã nhập
            # nghĩa là **không sinh thêm bút toán mở sổ**, và số dư không nhân
            # đôi. Vẫn ghi vào danh sách đối chiếu để lần chạy lại cũng kiểm
            # lại số dư.
            report.packages_skipped += 1
            try:
                credits = _as_int(
                    row.get("so_buoi_con_lai"), field_name="so_buoi_con_lai", row_ref=row_ref
                )
            except ValueError as exc:
                report.problems.append(str(exc))
                continue
            expected.append(ExpectedBalance(external_ref, existing.id, credits))
            continue

        student = students.get(student_ref) or db.scalar(
            select(Student).where(
                Student.import_source == source, Student.external_ref == student_ref
            )
        )
        if student is None:
            report.problems.append(f"{row_ref}: không tìm thấy học viên '{student_ref}'.")
            continue

        try:
            credits = _as_int(
                row.get("so_buoi_con_lai"), field_name="so_buoi_con_lai", row_ref=row_ref
            )
            # `so_buoi_ban_dau` là cột tuỳ chọn. Không có thì lấy bằng số
            # buổi còn lại: studio không nhớ gói gốc bao nhiêu buổi là chuyện
            # bình thường, còn bịa ra một con số tròn trịa thì màn hình sẽ nói
            # học viên đã tập bao nhiêu buổi — một điều không ai biết.
            original = row.get("so_buoi_ban_dau")
            spec = PackageSpec(
                name=_text(row.get("ten_goi")) or "Gói nhập từ file",
                price=_as_decimal(row.get("gia")),
                credits=(
                    _as_int(original, field_name="so_buoi_ban_dau", row_ref=row_ref)
                    if _text(original)
                    else credits
                ),
                class_type=_as_class_type(row.get("loai_lop"), row_ref=row_ref),
                start_date=_as_date(
                    row.get("ngay_bat_dau"), field_name="ngay_bat_dau", row_ref=row_ref
                ),
                end_date=_as_date(
                    row.get("ngay_het_han"), field_name="ngay_het_han", row_ref=row_ref
                ),
            )
        except ValueError as exc:
            report.problems.append(str(exc))
            continue

        # Cả gói lẫn bút toán mở sổ nằm trong **một** savepoint: chúng là hai
        # vế của cùng một sự kiện, và một dòng hỏng không được để lại gói không
        # có sổ hay sổ không có gói.
        try:
            with db.begin_nested():
                package = sell_package(
                    db,
                    student_id=student.id,
                    spec=spec,
                    actor_user_id=actor_user_id,
                    import_source=source,
                    external_ref=external_ref,
                    # Gói đã mua từ trước nhập vào theo **số buổi còn lại**, và
                    # nó vào sổ dưới dạng bút toán mở sổ.
                    opening_credits=credits,
                )
        except IntegrityError as exc:
            report.problems.append(f"{row_ref}: {_explain(exc)}.")
            continue
        except BusinessError as exc:
            report.problems.append(f"{row_ref}: {exc.message}")
            continue
        report.packages_created += 1
        expected.append(ExpectedBalance(external_ref, package.id, credits))
    return expected


def _import_sessions(
    db: Session,
    rows: list[dict],
    source: str,
    trainers: dict[str, Trainer],
    actor_user_id: int,
    report: ImportReport,
) -> None:
    for index, row in enumerate(rows, start=2):
        row_ref = f"lich_lop!{index}"
        external_ref = _text(row.get("ma_lop"))
        trainer_name = _text(row.get("ten_hlv"))
        if not external_ref or not trainer_name:
            report.problems.append(f"{row_ref}: thiếu mã lớp hoặc tên HLV.")
            continue

        existing = db.scalar(
            select(ClassSession).where(
                ClassSession.import_source == source,
                ClassSession.external_ref == external_ref,
            )
        )
        if existing is not None:
            report.sessions_skipped += 1
            continue

        trainer = trainers.get(trainer_name) or db.scalar(
            select(Trainer).where(Trainer.full_name == trainer_name)
        )
        if trainer is None:
            report.problems.append(f"{row_ref}: không tìm thấy HLV '{trainer_name}'.")
            continue

        try:
            class_type = _as_class_type(row.get("loai_lop"), row_ref=row_ref)
            class_session = ClassSession(
                starts_at=_as_datetime(
                    row.get("bat_dau"), field_name="bat_dau", row_ref=row_ref
                ),
                ends_at=_as_datetime(
                    row.get("ket_thuc"), field_name="ket_thuc", row_ref=row_ref
                ),
                trainer_id=trainer.id,
                class_type=class_type,
                capacity=_as_int(
                    row.get("suc_chua"), field_name="suc_chua", row_ref=row_ref
                ),
                created_by=actor_user_id,
                import_source=source,
                external_ref=external_ref,
            )
        except ValueError as exc:
            report.problems.append(str(exc))
            continue

        if not _add_row(db, class_session, report=report, row_ref=row_ref):
            continue
        report.sessions_created += 1


# --- Chạy --------------------------------------------------------------------


def _resolve_actor(db: Session, email: str | None) -> User:
    stmt = select(User).where(User.role == Role.ADMIN)
    if email:
        stmt = stmt.where(User.email == email.lower())
    actor = db.scalars(stmt.order_by(User.id)).first()
    if actor is None:
        raise SystemExit(
            "Không tìm thấy tài khoản ADMIN để ghi nhận người thực hiện. "
            "Chạy `scripts.seed_admin` trước."
        )
    return actor


def run_import(
    db: Session, *, path: Path, source: str, actor_user_id: int
) -> tuple[ImportReport, list[str]]:
    """Nhập toàn bộ file. Nơi gọi quyết định commit hay rollback."""
    workbook = load_workbook(path, data_only=True, read_only=True)
    report = ImportReport()

    students = _import_students(db, _rows(workbook, "hoc_vien"), source, report)
    trainers = _import_trainers(db, _rows(workbook, "hlv"), report)
    expected = _import_packages(
        db, _rows(workbook, "goi_tap"), source, students, actor_user_id, report
    )
    _import_sessions(
        db, _rows(workbook, "lich_lop"), source, trainers, actor_user_id, report
    )
    db.flush()

    # Đối chiếu với **con số trong file**, không chỉ với chính sổ. Khẳng định
    # "SUM(delta) = SUM(delta)" luôn đúng và không chứng minh được gì; thứ cần
    # chứng minh là số dư sau khi nhập bằng đúng số buổi studio khai.
    failures: list[str] = []
    for item in expected:
        actual = credit_ledger.balance_of(db, item.student_package_id)
        if actual != item.credits_from_file:
            failures.append(
                f"Gói '{item.external_ref}': sổ ghi {actual} buổi, file ghi "
                f"{item.credits_from_file} buổi."
            )

    for violation in check_invariants(db):
        failures.append(f"{violation.code}: {violation.description} ({violation.total} bản ghi)")

    return report, failures


def record_run(
    *,
    source: str,
    file_hash: str,
    dry_run: bool,
    report: ImportReport,
    failures: list[str],
    actor_user_id: int,
) -> int:
    """Ghi dấu vết một lần chạy — **transaction riêng, commit dù dữ liệu bị lùi**.

    Nhật ký chạy không được chung số phận với dữ liệu nó mô tả. Ghi chung
    transaction thì lần chạy thử rollback luôn cả dòng nhật ký, và cột `dry_run`
    không bao giờ mang giá trị `True`: yêu cầu *diễn tập đầy đủ trên bản sao
    giống PROD trước ngày nhập thật* không để lại gì để chứng minh đã diễn tập.

    Cũng vì vậy đây là session riêng: một lần nhập hỏng vì số dư lệch vẫn phải
    để lại bằng chứng rằng nó đã chạy và đã hỏng vì lý do gì.
    """
    with SessionLocal() as log_db:
        entry = ImportRun(
            source=source,
            file_hash=file_hash,
            dry_run=dry_run,
            summary=json.dumps(
                {"report": report.as_dict(), "failures": failures},
                ensure_ascii=False,
            ),
            actor_user_id=actor_user_id,
        )
        log_db.add(entry)
        log_db.commit()
        return entry.id


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Nhập dữ liệu ban đầu từ Excel.")
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument(
        "--source",
        required=True,
        help="Nhãn nguồn dữ liệu, đi cùng mã dòng thành khoá chống nhập trùng.",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Ghi thật. Không có cờ này thì chạy thử rồi rollback.",
    )
    parser.add_argument("--actor-email", default=None)
    args = parser.parse_args(argv)

    if not args.file.exists():
        print(f"Không tìm thấy file {args.file}.", file=sys.stderr)
        return 1

    file_hash = hashlib.sha256(args.file.read_bytes()).hexdigest()

    with SessionLocal() as db:
        actor = _resolve_actor(db, args.actor_email)
        report, failures = run_import(
            db, path=args.file, source=args.source, actor_user_id=actor.id
        )

        record_run(
            source=args.source,
            file_hash=file_hash,
            dry_run=not args.commit,
            report=report,
            failures=failures,
            actor_user_id=actor.id,
        )

        print(json.dumps(report.as_dict(), ensure_ascii=False, indent=2))
        print(f"file_hash: {file_hash}")

        if report.problems or failures:
            for message in [*report.problems, *failures]:
                print(f"- {message}", file=sys.stderr)

        if failures:
            db.rollback()
            print("Số dư sau khi nhập không khớp file — đã huỷ toàn bộ.", file=sys.stderr)
            return 2

        if not args.commit:
            db.rollback()
            print("Chạy thử: đã rollback. Thêm --commit để ghi thật.")
            return 1 if report.problems else 0

        db.commit()
        print("Đã ghi vào cơ sở dữ liệu.")
        return 1 if report.problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
