"""Điểm vào ứng dụng."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg import errors as pg_errors
from sqlalchemy.exc import DBAPIError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.api import (
    accounts,
    announcements,
    auth,
    bookings,
    classes,
    leads,
    my_schedule,
    packages,
    payments,
    progress_photos,
    public,
    renewals,
    reports,
    students,
    trainers,
)
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Pilates Studio API",
    version="0.1.0",
    description=(
        "Backend quản lý & đặt lớp Pilates. Mọi mốc thời gian là timestamptz; "
        "quy tắc nghiệp vụ tính theo Asia/Ho_Chi_Minh."
    ),
)

# BE và FE khác origin → allow-list tường minh, không dùng "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """API chỉ trả JSON và file tải về, nên CSP có thể siết hết mức."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(public.router)
app.include_router(leads.public_router)
app.include_router(leads.router)
app.include_router(students.router)
app.include_router(progress_photos.router)
app.include_router(trainers.router)
app.include_router(announcements.router)
app.include_router(packages.types_router)
app.include_router(packages.router)
app.include_router(payments.router)
app.include_router(classes.router)
app.include_router(bookings.router)
app.include_router(my_schedule.router)
app.include_router(renewals.router)
app.include_router(reports.router)


@app.exception_handler(DBAPIError)
async def handle_transient_db_conflict(request: Request, exc: DBAPIError) -> JSONResponse:
    """Tranh chấp khoá là chuyện thử lại được, không phải sự cố hệ thống.

    Hủy hai buổi lớp cùng lúc có một nhánh hiếm khoá chéo nhau (ghi rõ ở
    `cancel_session`). PostgreSQL gỡ bằng cách huỷ một bên; không bắt ở đây thì
    người dùng nhận 500 kèm traceback thay vì một câu bảo họ bấm lại.
    """
    if isinstance(exc.orig, pg_errors.DeadlockDetected | pg_errors.SerializationFailure):
        return JSONResponse(
            status_code=409,
            content={
                "detail": {
                    "code": "CONCURRENT_CONFLICT",
                    "message": "Thao tác đang tranh chấp với người khác. Vui lòng thử lại.",
                }
            },
        )
    raise exc


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    """Kiểm tra ứng dụng còn sống. Không chạm cơ sở dữ liệu."""
    return {"status": "ok"}
