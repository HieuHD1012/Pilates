"""Luồng xác thực (F01)."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.rules import Role
from app.models.user import PasswordReset
from tests.conftest import TEST_PASSWORD, auth_header, login, make_user

NEW_PASSWORD = "MatKhauMoi#2026"


def test_login_returns_token_pair(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.ADMIN)
    tokens = login(client, user.email)
    assert tokens["access_token"] and tokens["refresh_token"]

    me = client.get("/auth/me", headers=auth_header(tokens["access_token"]))
    assert me.status_code == 200
    assert me.json()["role"] == "ADMIN"


def test_login_with_wrong_password_rejected(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STAFF)
    response = client.post("/auth/login", json={"email": user.email, "password": "sai-mat-khau"})
    assert response.status_code == 401


def test_login_brute_force_is_blocked(client: TestClient, db: Session) -> None:
    """Sau ngưỡng lần thử sai, /auth/login trả 429 kèm Retry-After."""
    user = make_user(db, Role.STAFF)
    payload = {"email": user.email, "password": "sai-mat-khau"}

    statuses = [client.post("/auth/login", json=payload).status_code for _ in range(8)]
    assert 429 in statuses, statuses

    blocked = client.post("/auth/login", json={"email": user.email, "password": TEST_PASSWORD})
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_refresh_rotates_token(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STUDENT)
    tokens = login(client, user.email)

    refreshed = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refreshed.status_code == 200
    assert refreshed.json()["refresh_token"] != tokens["refresh_token"]


def test_reusing_rotated_refresh_token_revokes_everything(
    client: TestClient, db: Session
) -> None:
    """Dùng lại refresh token đã xoay vòng, ngoài cửa sổ ân hạn, là trộm token."""
    from datetime import timedelta

    from sqlalchemy import select

    from app.config import get_settings
    from app.domain.rules import now
    from app.models.user import RefreshToken

    user = make_user(db, Role.STUDENT)
    tokens = login(client, user.email)
    rotated = client.post(
        "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    ).json()

    # Đẩy lần xoay vòng ra ngoài cửa sổ ân hạn: đây là một lần replay thật,
    # không phải hai request song song của cùng một lần làm mới.
    grace = get_settings().refresh_reuse_grace_seconds
    old_token = db.scalars(
        select(RefreshToken).where(RefreshToken.replaced_by.is_not(None))
    ).one()
    old_token.revoked_at = now() - timedelta(seconds=grace + 60)
    db.commit()

    replayed = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert replayed.status_code == 401

    # Cả token mới cũng phải chết theo — kẻ tấn công không được giữ phiên.
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": rotated["refresh_token"]}
        ).status_code
        == 401
    )


def test_duplicate_refresh_inside_grace_returns_same_token(
    client: TestClient, db: Session
) -> None:
    """Gửi trùng ngay lập tức thì được trả lại đúng bản thay thế, không bị đá ra.

    Đây là hành vi thật của một SPA bắn nhiều request cùng lúc lúc access token
    hết hạn, không phải hành vi của kẻ trộm token.
    """
    user = make_user(db, Role.STUDENT)
    tokens = login(client, user.email)

    first = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    second = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})

    assert second.status_code == 200
    assert second.json()["refresh_token"] == first.json()["refresh_token"]

    # Phiên vẫn sống: bản thay thế dùng tiếp được.
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": first.json()["refresh_token"]}
        ).status_code
        == 200
    )


def test_forgot_password_never_returns_token(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STAFF)
    with patch("app.api.auth.send_password_reset") as sender:
        response = client.post("/auth/forgot-password", json={"email": user.email})
    assert response.status_code == 200
    assert "token" not in response.text.lower()
    sender.assert_called_once()


def test_forgot_password_does_not_reveal_whether_email_exists(
    client: TestClient, db: Session
) -> None:
    user = make_user(db, Role.STAFF)
    with patch("app.api.auth.send_password_reset"):
        known = client.post("/auth/forgot-password", json={"email": user.email})
    unknown = client.post("/auth/forgot-password", json={"email": "khong-ton-tai@example.com"})

    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()


def test_reset_link_is_single_use(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STAFF)
    with patch("app.api.auth.send_password_reset") as sender:
        client.post("/auth/forgot-password", json={"email": user.email})
    raw_token = sender.call_args.args[1]

    first = client.post(
        "/auth/reset-password", json={"token": raw_token, "new_password": NEW_PASSWORD}
    )
    assert first.status_code == 200

    second = client.post(
        "/auth/reset-password", json={"token": raw_token, "new_password": "MatKhauKhac#2026"}
    )
    assert second.status_code == 401

    assert login(client, user.email, NEW_PASSWORD)["access_token"]


def test_reset_token_is_stored_hashed(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STAFF)
    with patch("app.api.auth.send_password_reset") as sender:
        client.post("/auth/forgot-password", json={"email": user.email})
    raw_token = sender.call_args.args[1]

    stored = db.scalars(select(PasswordReset)).all()
    assert len(stored) == 1
    assert stored[0].token_hash != raw_token


def test_expired_reset_link_rejected(client: TestClient, db: Session) -> None:
    from datetime import timedelta

    from app.domain.rules import now

    user = make_user(db, Role.STAFF)
    with patch("app.api.auth.send_password_reset") as sender:
        client.post("/auth/forgot-password", json={"email": user.email})
    raw_token = sender.call_args.args[1]

    record = db.scalars(select(PasswordReset)).one()
    record.expires_at = now() - timedelta(minutes=1)
    db.commit()

    response = client.post(
        "/auth/reset-password", json={"token": raw_token, "new_password": NEW_PASSWORD}
    )
    assert response.status_code == 401


def test_change_password_requires_current_password(client: TestClient, db: Session) -> None:
    """Áp cho mọi vai, kể cả ADMIN."""
    user = make_user(db, Role.ADMIN)
    token = login(client, user.email)["access_token"]

    wrong = client.post(
        "/auth/change-password",
        json={"current_password": "sai", "new_password": NEW_PASSWORD},
        headers=auth_header(token),
    )
    assert wrong.status_code == 401

    right = client.post(
        "/auth/change-password",
        json={"current_password": TEST_PASSWORD, "new_password": NEW_PASSWORD},
        headers=auth_header(token),
    )
    assert right.status_code == 200


def test_change_password_revokes_existing_sessions(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.ADMIN)
    tokens = login(client, user.email)

    client.post(
        "/auth/change-password",
        json={"current_password": TEST_PASSWORD, "new_password": NEW_PASSWORD},
        headers=auth_header(tokens["access_token"]),
    )

    replay = client.post("/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert replay.status_code == 401


def test_account_without_password_cannot_log_in(client: TestClient, db: Session) -> None:
    """Tài khoản nhập từ Excel chưa kích hoạt: không mật khẩu, không đăng nhập."""
    user = make_user(db, Role.STUDENT, password=None)
    response = client.post("/auth/login", json={"email": user.email, "password": "bat-ky"})
    assert response.status_code == 401


# --- Lỗ hổng xác thực phát hiện khi review F01 -------------------------------


def test_refresh_token_cannot_be_used_as_access_token(
    client: TestClient, db: Session
) -> None:
    """Refresh token không được dùng làm `Authorization: Bearer`.

    Thiếu phép kiểm `typ`, mọi JWT ký đúng khoá đều qua được: refresh token
    cũng mang `sub`, nên nó trở thành một access token sống 14 ngày mà
    `logout`, đổi mật khẩu và thu hồi phiên đều không chạm tới.
    """
    user = make_user(db, Role.ADMIN)
    tokens = login(client, user.email)

    response = client.get("/auth/me", headers=auth_header(tokens["refresh_token"]))
    assert response.status_code == 401


def test_logout_kills_access_token_too(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STAFF)
    tokens = login(client, user.email)

    client.post("/auth/logout", headers=auth_header(tokens["access_token"]))
    assert (
        client.post(
            "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        ).status_code
        == 401
    )


def test_ip_throttle_survives_a_successful_login(client: TestClient, db: Session) -> None:
    """Đăng nhập thành công không được xoá bộ đếm theo IP.

    Nếu xoá, kẻ tấn công rải mật khẩu qua nhiều tài khoản chỉ cần xen một lần
    đăng nhập thật bằng tài khoản của chính mình sau mỗi vài lần thử sai — và
    chiều IP, chiều duy nhất chống spray, biến mất.
    """
    attacker = make_user(db, Role.STUDENT, email="ke-tan-cong@example.com")
    for index in range(8):
        make_user(db, Role.STAFF, email=f"nan-nhan{index}@example.com")

    def spray(index: int) -> int:
        """Đoán mật khẩu một tài khoản mới, rồi xen một lần đăng nhập thật."""
        guess = client.post(
            "/auth/login",
            json={"email": f"nan-nhan{index}@example.com", "password": "doan-mat-khau"},
        )
        client.post(
            "/auth/login", json={"email": attacker.email, "password": TEST_PASSWORD}
        )
        return guess.status_code

    statuses = [spray(index) for index in range(8)]
    assert 429 in statuses, statuses


def test_successful_login_clears_only_the_account_counter(
    client: TestClient, db: Session
) -> None:
    """Người gõ nhầm vài lần rồi đăng nhập đúng thì không bị phạt tiếp."""
    user = make_user(db, Role.STAFF)
    for _ in range(3):
        client.post("/auth/login", json={"email": user.email, "password": "go-nham"})

    assert login(client, user.email)["access_token"]
    assert login(client, user.email)["access_token"]


def test_forgot_password_is_rate_limited(client: TestClient, db: Session) -> None:
    """Endpoint ẩn danh sinh email và ghi CSDL — không giới hạn là công cụ mail bomb."""
    user = make_user(db, Role.STAFF)
    statuses = [
        client.post("/auth/forgot-password", json={"email": user.email}).status_code
        for _ in range(6)
    ]
    assert 429 in statuses, statuses
