"""Endpoint hạ tầng: `/health`.

Đứng riêng vì nó không thuộc nhóm nghiệp vụ nào — nó là hợp đồng với **bộ điều
phối container**, không với người dùng. Ba tính chất dưới đây là thứ làm nó
dùng được làm liveness probe.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_answers_without_a_token(client: TestClient) -> None:
    """Probe không có tài khoản để đăng nhập.

    Bắt xác thực ở đây làm mọi lần kiểm sống trả 401, và bộ điều phối đọc 401
    là "còn sống" — nên phép kiểm không còn phát hiện được gì.
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_declares_no_database_dependency() -> None:
    """Không chạm CSDL — cố ý, và đây là phần dễ bị sửa hỏng nhất.

    Một probe có truy vấn CSDL biến sự cố CSDL thành sự cố container: bộ điều
    phối thấy probe đỏ, giết tiến trình API và khởi động lại, trong khi thứ hỏng
    nằm ở chỗ khác. Khởi động lại không sửa được gì và còn xoá sạch bộ đếm chặn
    brute-force đang nằm trong bộ nhớ tiến trình.

    Phép kiểm đọc **bảng route của ứng dụng**, không gọi qua `TestClient`:
    fixture `client` ghi đè `get_db` bằng session của test, nên mọi phép kiểm
    kiểu "chặn `SessionLocal` rồi xem có nổ không" đều xanh vĩnh viễn — kể cả
    khi route đã thật sự khai phụ thuộc CSDL.
    """
    from app.db import get_db
    from app.main import app

    route = next(r for r in app.routes if getattr(r, "path", None) == "/health")

    def dependency_calls(dependant) -> list:
        found = [dependant.call] if dependant.call is not None else []
        for sub in dependant.dependencies:
            found.extend(dependency_calls(sub))
        return found

    assert get_db not in dependency_calls(route.dependant)
