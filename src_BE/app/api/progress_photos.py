"""Ảnh tiến trình — dữ liệu nhạy cảm nhất của hệ thống.

Đây là ảnh cơ thể của người thật. Ba lớp bảo vệ, và cả ba đều cần thiết:

1. **Ma trận quyền đúng** — ADMIN, HLV **phụ trách học viên đó**, và chính học
   viên đó. STAFF bị từ chối: đáp án của khách không có STAFF, và lễ tân không
   có lý do nghiệp vụ nào để xem.
2. **Không public bucket.** Tệp nằm ngoài web root và chỉ ra ngoài qua endpoint
   dưới đây, sau khi kiểm quyền.
3. **Upload guard** — mã hoá lại để bóc EXIF (ảnh điện thoại mang toạ độ GPS
   nhà học viên), và khoá lưu ngẫu nhiên nên đoán đường dẫn không ăn thua.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.core.permissions import (
    Actor,
    assert_can_view_progress_photos,
    get_current_actor,
    require_admin,
)
from app.core.upload_guard import (
    STORED_CONTENT_TYPE,
    delete_image,
    prepare_image,
    read_image,
    read_upload,
    write_prepared,
)
from app.db import get_db
from app.domain.rules import now
from app.models.people import ProgressPhoto, Student
from app.schemas.people import ProgressPhotoResponse

router = APIRouter(prefix="/students/{student_id}/progress-photos", tags=["progress-photos"])


def _assert_student_exists(db: Session, student_id: int) -> None:
    if db.scalar(select(Student.id).where(Student.id == student_id)) is None:
        raise NotFoundError("Không tìm thấy học viên.")


def _get_photo(db: Session, student_id: int, photo_id: int) -> ProgressPhoto:
    """Lấy ảnh **có ghim `student_id`**.

    Ghim chủ sở hữu vào chính câu truy vấn: nếu chỉ tra theo `photo_id` rồi mới
    kiểm quyền, một người có quyền xem ảnh của học viên A sẽ đọc được ảnh của
    học viên B chỉ bằng cách đưa id ảnh của B vào đường dẫn của A.
    """
    photo = db.scalar(
        select(ProgressPhoto).where(
            ProgressPhoto.id == photo_id, ProgressPhoto.student_id == student_id
        )
    )
    if photo is None:
        raise NotFoundError("Không tìm thấy ảnh tiến trình.")
    return photo


@router.get("", response_model=list[ProgressPhotoResponse])
def list_progress_photos(
    student_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> list[ProgressPhoto]:
    """Danh sách ảnh, sắp theo thời điểm chụp để so sánh bắt đầu ↔ hiện tại."""
    assert_can_view_progress_photos(db, actor, student_id)
    _assert_student_exists(db, student_id)
    return list(
        db.scalars(
            select(ProgressPhoto)
            .where(ProgressPhoto.student_id == student_id)
            .order_by(ProgressPhoto.taken_at, ProgressPhoto.id)
        )
    )


@router.post("", response_model=ProgressPhotoResponse, status_code=201)
def upload_progress_photo(
    student_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    taken_at: datetime | None = Form(default=None),
) -> ProgressPhoto:
    """Tải ảnh tiến trình.

    Quyền tải trùng với quyền xem — cùng một tập người, cùng một quy tắc. Hai
    quy tắc riêng cho cùng một tài nguyên là hai chỗ để lệch nhau.
    """
    assert_can_view_progress_photos(db, actor, student_id)
    _assert_student_exists(db, student_id)

    # Kiểm ảnh trước, chèn hàng và flush (ràng buộc CSDL lên tiếng ở đây), rồi
    # mới ghi tệp. Ghi tệp trước thì mọi lần vi phạm ràng buộc để lại một tệp
    # ảnh cơ thể mồ côi mà không hàng nào trỏ tới.
    prepared = prepare_image(read_upload(file), prefix="progress")
    photo = ProgressPhoto(
        student_id=student_id,
        storage_key=prepared.storage_key,
        taken_at=taken_at or now(),
        uploaded_by=actor.id,
    )
    db.add(photo)
    db.flush()
    write_prepared(prepared)
    return photo


@router.get("/{photo_id}/file")
def get_progress_photo_file(
    student_id: int,
    photo_id: int,
    actor: Actor = Depends(get_current_actor),
    db: Session = Depends(get_db),
) -> Response:
    """Nội dung nhị phân của một ảnh tiến trình.

    Ảnh **không** phục vụ qua URL tĩnh: mỗi lần xem đều đi qua đây kèm token và
    bị kiểm quyền lại.
    """
    assert_can_view_progress_photos(db, actor, student_id)
    photo = _get_photo(db, student_id, photo_id)
    return Response(
        content=read_image(photo.storage_key),
        media_type=STORED_CONTENT_TYPE,
        headers={
            # Ảnh riêng tư: không để proxy hay CDN nào giữ bản sao, và luôn tải
            # về thay vì render trong origin của API.
            "Cache-Control": "private, no-store",
            "Content-Disposition": f'attachment; filename="anh-tien-trinh-{photo_id}.jpg"',
        },
    )


@router.delete("/{photo_id}", status_code=204)
def delete_progress_photo(
    student_id: int,
    photo_id: int,
    actor: Actor = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    """Xoá vĩnh viễn một ảnh tiến trình — **chỉ ADMIN**.

    Quyền xoá cố ý hẹp hơn quyền xem. Xem là thao tác đọc, xoá là huỷ dữ liệu
    không hoàn tác: cho HLV phụ trách xoá nghĩa là họ xoá được ảnh của học viên
    mình dạy, và cho học viên xoá nghĩa là bằng chứng tiến trình biến mất theo
    một lần bấm nhầm.

    Đáp án câu 15 của khách chỉ nói về quyền **xem**, nên đây là mặc định an
    toàn và đang chờ khách xác nhận (`docs/business-rules.md`).
    """
    photo = _get_photo(db, student_id, photo_id)
    storage_key = photo.storage_key
    db.delete(photo)
    # Commit trước khi xoá tệp: rollback sau khi tệp đã mất sẽ để lại một hàng
    # trỏ vào ảnh không còn tồn tại.
    db.commit()
    delete_image(storage_key)
