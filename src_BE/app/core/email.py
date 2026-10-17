"""Email giao dịch — hiện chỉ dùng cho luồng đặt lại mật khẩu.

Token đặt lại **chỉ** đi ra ngoài qua kênh này, không bao giờ nằm trong
response API. Render Free dùng Resend qua HTTPS; môi trường khác có thể dùng SMTP.
"""

from __future__ import annotations

import json
import logging
import smtplib
from email.message import EmailMessage
from urllib.request import Request, urlopen

from app.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    settings = get_settings()
    if settings.resend_api_key:
        request = Request(
            "https://api.resend.com/emails",
            data=json.dumps({
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "text": body,
            }).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=10) as response:
            if not 200 <= response.status < 300:
                raise OSError(f"Resend returned HTTP {response.status}")
        return

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user and settings.smtp_password:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def send_password_reset(to: str, raw_token: str) -> None:
    """Gửi link đặt lại mật khẩu.

    Lỗi gửi thư không được làm hỏng request: nếu không, `/auth/forgot-password`
    trả 200 khi email tồn tại và 500 khi SMTP hỏng — hai mã trả về khác nhau
    tuỳ email, đúng thứ luồng này tồn tại để che.
    """
    settings = get_settings()
    link = settings.password_reset_url_template.format(token=raw_token)
    try:
        send_email(
            to,
            "Đặt lại mật khẩu",
            "Bạn vừa yêu cầu đặt lại mật khẩu.\n\n"
            f"Mở liên kết sau để đặt mật khẩu mới (hết hạn sau "
            f"{settings.password_reset_minutes} phút, chỉ dùng được một lần):\n\n"
            f"{link}\n\n"
            "Nếu không phải bạn yêu cầu, hãy bỏ qua thư này.",
        )
    except OSError:
        logger.exception("Không gửi được email đặt lại mật khẩu")
