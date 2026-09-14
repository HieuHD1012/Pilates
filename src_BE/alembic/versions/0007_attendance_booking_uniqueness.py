"""Lượt đã điểm danh vẫn là lượt đăng ký của học viên trong lớp.

Revision ID: 0007
Revises: 0006
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP INDEX uq_booking_active_per_student_session")
    op.execute(
        "CREATE UNIQUE INDEX uq_booking_active_per_student_session "
        "ON booking (class_session_id, student_id) "
        "WHERE status IN ('BOOKED', 'ATTENDED', 'NO_SHOW')"
    )


def downgrade() -> None:
    op.execute("DROP INDEX uq_booking_active_per_student_session")
    op.execute(
        "CREATE UNIQUE INDEX uq_booking_active_per_student_session "
        "ON booking (class_session_id, student_id) WHERE status = 'BOOKED'"
    )
