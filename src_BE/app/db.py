"""Kết nối CSDL và phiên làm việc."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

_settings = get_settings()

engine = create_engine(
    str(_settings.database_url),
    pool_pre_ping=True,
    # Mọi mốc thời gian là timestamptz; đặt phiên về UTC để driver luôn trả về
    # datetime aware và không có bước quy đổi ngầm nào theo giờ máy chủ.
    connect_args={"options": "-c timezone=UTC"},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Dependency của FastAPI: một transaction cho một request."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
