"""Quản lý thông báo: danh sách, sửa và xoá (F02).

`test_content_enforcement_api.py` đã phủ **đường tạo** — nội dung vi phạm quy
tắc trang công khai bị chặn ngay khi đăng. File này phủ ba đường còn lại, và
mệnh đề quan trọng nhất nằm ở đường **sửa**:

> Nội dung đã đăng rồi vẫn phải đi qua đúng bộ lọc đó khi bị sửa.

Thiếu phép kiểm này thì câu bị cấm lên trang công khai qua hai bước hoàn toàn
hợp lệ: đăng một nội dung sạch, rồi sửa nó thành câu bị cấm. Cổng CI mù với
đường đó vì nội dung nằm trong CSDL, không nằm trong mã nguồn.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import Role
from tests.conftest import auth_header, login, make_user


def _headers(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


def _create(client: TestClient, headers: dict, **overrides) -> dict:
    payload = {
        "title": "Ưu đãi tháng 10",
        "body": "Studio mở thêm khung sáng cho lớp Reformer.",
        "is_published": True,
    } | overrides
    response = client.post("/announcements", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def staff_headers(client: TestClient, db: Session) -> dict[str, str]:
    return _headers(client, make_user(db, Role.STAFF))


# --- Danh sách ---------------------------------------------------------------


def test_list_includes_drafts_so_staff_can_find_them_again(
    client: TestClient, staff_headers: dict
) -> None:
    """Danh sách của nhân viên gồm cả bản nháp.

    Trang công khai chỉ trả bài đã đăng. Nếu màn quản lý cũng lọc như vậy thì
    một bản nháp lưu dở là một bản nháp không còn đường mở lại.
    """
    published = _create(client, staff_headers, title="Bài đã đăng")
    draft = _create(client, staff_headers, title="Bài nháp", is_published=False)

    rows = client.get("/announcements", headers=staff_headers).json()
    assert {row["id"] for row in rows} == {published["id"], draft["id"]}

    only_drafts = client.get(
        "/announcements", headers=staff_headers, params={"is_published": False}
    ).json()
    assert [row["id"] for row in only_drafts] == [draft["id"]]


def test_student_cannot_read_the_management_list(client: TestClient, db: Session) -> None:
    student = make_user(db, Role.STUDENT, email="hv-thong-bao@example.com")
    assert client.get("/announcements", headers=_headers(client, student)).status_code == 403


# --- Sửa: nội dung phải được lọc lại -----------------------------------------


@pytest.mark.parametrize(
    ("body", "expected_code"),
    [
        ("Lớp tối đa 3 người mỗi buổi", "P3_CLASS_SIZE_CLAIM"),
        ("Giờ mở cửa 7:30 - 19:30 mỗi ngày", "P3_OPENING_HOURS"),
        ("Doanh thu quý này tăng mạnh", "P3_BUSINESS_METRICS"),
    ],
)
def test_editing_a_clean_announcement_into_a_banned_one_is_rejected(
    client: TestClient, staff_headers: dict, body: str, expected_code: str
) -> None:
    """Đường vòng ngắn nhất để đưa câu bị cấm lên web: đăng sạch rồi sửa."""
    announcement = _create(client, staff_headers)

    response = client.patch(
        f"/announcements/{announcement['id']}", headers=staff_headers, json={"body": body}
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == expected_code

    # Và bản đang nằm trên web không bị đụng tới.
    unchanged = client.get("/announcements", headers=staff_headers).json()[0]
    assert unchanged["body"] == announcement["body"]


def test_editing_the_title_is_checked_as_well(
    client: TestClient, staff_headers: dict
) -> None:
    """Tiêu đề cũng hiện trên trang công khai, nên cũng đi qua bộ lọc."""
    announcement = _create(client, staff_headers)
    response = client.patch(
        f"/announcements/{announcement['id']}",
        headers=staff_headers,
        json={"title": "Lớp tối đa 3 người"},
    )
    assert response.status_code == 422


def test_editing_strips_markup_instead_of_storing_it(
    client: TestClient, staff_headers: dict
) -> None:
    announcement = _create(client, staff_headers)
    updated = client.patch(
        f"/announcements/{announcement['id']}",
        headers=staff_headers,
        json={"body": "<script>alert(1)</script>Lịch mới đã lên."},
    )
    assert updated.status_code == 200
    assert updated.json()["body"] == "Lịch mới đã lên."


def test_editing_records_who_changed_it_and_when(
    client: TestClient, db: Session, staff_headers: dict
) -> None:
    """Nội dung công khai là thứ khách đọc — sửa nó phải để lại dấu vết."""
    announcement = _create(client, staff_headers)
    assert announcement["updated_at"] is None and announcement["updated_by"] is None

    editor = make_user(db, Role.STAFF, email="letan-sua@example.com")
    updated = client.patch(
        f"/announcements/{announcement['id']}",
        headers=_headers(client, editor),
        json={"is_published": False},
    ).json()

    assert updated["is_published"] is False
    assert updated["updated_by"] == editor.id
    assert updated["updated_at"] is not None
    # Người tạo không bị ghi đè bởi người sửa.
    assert updated["created_by"] == announcement["created_by"]


# --- Xoá ---------------------------------------------------------------------


def test_delete_removes_it_from_both_lists(client: TestClient, staff_headers: dict) -> None:
    announcement = _create(client, staff_headers)
    assert client.get("/public/announcements").json() != []

    assert (
        client.delete(f"/announcements/{announcement['id']}", headers=staff_headers).status_code
        == 204
    )
    assert client.get("/announcements", headers=staff_headers).json() == []
    assert client.get("/public/announcements").json() == []


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_touching_an_unknown_announcement_is_a_404(
    client: TestClient, staff_headers: dict, method: str
) -> None:
    """Gồm cả lần bấm thứ hai vào một bài vừa bị người khác xoá."""
    kwargs = {"json": {"title": "Đổi tên"}} if method == "patch" else {}
    response = getattr(client, method)(
        "/announcements/999999", headers=staff_headers, **kwargs
    )
    assert response.status_code == 404
