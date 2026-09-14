"""Cấm đăng ký đang giữ chỗ trên một buổi lớp đã hủy.

Luồng hủy lớp (F06) đặt `status = 'CANCELLED'` **trước** khi hoàn buổi, rồi
đọc lại danh sách đăng ký dưới khoá. Tính đúng của bước đọc lại đó dựa vào một
giả định: mọi đường ghi `booking` cũng lấy `FOR UPDATE` trên `class_session`.

Giả định đó hiện chỉ tồn tại trong docstring. Một đường ghi không khoá — booking
service của F07, một script vận hành, một lần nhập liệu — vẫn chèn được đăng ký
`BOOKED` vào lớp đã hủy, và học viên đó mất một buổi trên một lớp không tồn tại,
không có dòng hoàn nào. Đúng lỗi mà trình tự khoá được thiết kế để chặn.

Trigger dưới đây đưa giả định xuống tầng CSDL, nơi không ai quên được nó.

Revision ID: 0006
Revises: 0005
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


GUARD_FN = """
CREATE OR REPLACE FUNCTION booking_requires_live_session() RETURNS trigger AS $$
DECLARE
    session_status text;
BEGIN
    IF NEW.status <> 'BOOKED' THEN
        RETURN NEW;
    END IF;

    -- `FOR SHARE` chứ không phải SELECT trần: nếu một transaction hủy lớp
    -- đang giữ `FOR UPDATE` trên hàng này, câu lệnh dưới đây **chờ** nó xong
    -- rồi mới đọc lại. SELECT trần sẽ đọc bản đã commit — vẫn là 'SCHEDULED' —
    -- và cho đăng ký đi qua, để lại đúng thứ trigger này sinh ra để chặn.
    -- Khoá chia sẻ tương thích với nhau nên hai lần đặt chỗ song song không
    -- chặn nhau; và thứ tự khoá vẫn là student_package → class_session.
    SELECT status INTO session_status
      FROM class_session WHERE id = NEW.class_session_id FOR SHARE;

    IF session_status = 'CANCELLED' THEN
        RAISE EXCEPTION
            'Buoi lop % da bi huy nen khong nhan dang ky moi.', NEW.class_session_id
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""


def upgrade() -> None:
    op.execute(GUARD_FN)
    op.execute(
        "CREATE TRIGGER trg_booking_requires_live_session "
        "BEFORE INSERT OR UPDATE OF status, class_session_id ON booking "
        "FOR EACH ROW EXECUTE FUNCTION booking_requires_live_session()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_booking_requires_live_session ON booking")
    op.execute("DROP FUNCTION IF EXISTS booking_requires_live_session()")
