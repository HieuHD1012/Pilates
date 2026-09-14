"""Lỗi nghiệp vụ.

Vi phạm quy tắc nghiệp vụ phải đi ra ngoài thành 4xx nói rõ thiếu gì, không
được rơi thành 500 — "hết buổi", "hết hạn", "sai loại gói", "hết chỗ" là bốn
thông báo khác nhau và người dùng cần biết mình vướng cái nào.
"""

from __future__ import annotations

from fastapi import HTTPException, status


class BusinessError(HTTPException):
    """Yêu cầu hợp lệ về cú pháp nhưng vi phạm quy tắc nghiệp vụ."""

    def __init__(self, code: str, message: str, http_status: int = status.HTTP_409_CONFLICT):
        super().__init__(status_code=http_status, detail={"code": code, "message": message})
        self.code = code
        self.message = message


class NotFoundError(BusinessError):
    def __init__(self, message: str = "Không tìm thấy dữ liệu."):
        super().__init__("NOT_FOUND", message, status.HTTP_404_NOT_FOUND)


class ForbiddenError(BusinessError):
    def __init__(self, message: str = "Bạn không có quyền thực hiện thao tác này."):
        super().__init__("FORBIDDEN", message, status.HTTP_403_FORBIDDEN)


class UnauthorizedError(BusinessError):
    def __init__(self, message: str = "Cần đăng nhập."):
        super().__init__("UNAUTHORIZED", message, status.HTTP_401_UNAUTHORIZED)


class ValidationError(BusinessError):
    def __init__(self, message: str, code: str = "VALIDATION_ERROR"):
        super().__init__(code, message, status.HTTP_422_UNPROCESSABLE_ENTITY)


class RateLimitedError(BusinessError):
    def __init__(self, message: str, retry_after_seconds: int):
        super().__init__("RATE_LIMITED", message, status.HTTP_429_TOO_MANY_REQUESTS)
        self.headers = {"Retry-After": str(retry_after_seconds)}
