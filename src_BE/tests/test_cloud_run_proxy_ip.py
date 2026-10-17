"""Cloud Run must not use a client-supplied X-Forwarded-For prefix for rate limits."""

from types import SimpleNamespace

from starlette.requests import Request

from app.core import rate_limit


def test_google_proxy_ip_ignores_spoofed_prefix(monkeypatch) -> None:
    monkeypatch.setattr(
        rate_limit,
        "get_settings",
        lambda: SimpleNamespace(trust_proxy_headers=True, trusted_proxy_hops=2),
    )
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [
                (b"x-forwarded-for", b"198.51.100.99, 203.0.113.25, 192.0.2.10")
            ],
            "client": ("127.0.0.1", 12345),
        }
    )
    assert rate_limit.client_ip(request) == "203.0.113.25"
