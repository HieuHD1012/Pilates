"""Password reset mail can leave Render Free over HTTPS without exposing its token."""

import json
from types import SimpleNamespace

from pydantic import SecretStr

from app.core import email


def test_resend_transport_uses_https_and_plain_text(monkeypatch) -> None:
    captured = {}

    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return Response()

    monkeypatch.setattr(
        email,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key=SecretStr("test-key"),
            email_from="no-reply@jpilate.com",
        ),
    )
    monkeypatch.setattr(email, "urlopen", fake_urlopen)

    email.send_email("admin@jpilate.com", "Đặt lại mật khẩu", "secret-reset-link")

    request = captured["request"]
    assert request.full_url == "https://api.resend.com/emails"
    assert request.get_method() == "POST"
    assert captured["timeout"] == 10
    assert request.get_header("Authorization") == "Bearer test-key"
    assert json.loads(request.data) == {
        "from": "no-reply@jpilate.com",
        "to": ["admin@jpilate.com"],
        "subject": "Đặt lại mật khẩu",
        "text": "secret-reset-link",
    }
