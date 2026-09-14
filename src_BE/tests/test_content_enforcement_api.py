"""Validator quy tắc nội dung **khi ghi** (F02/F04).

Đây là lớp chặn duy nhất bắt được nội dung nhân viên nhập **sau go-live**.
Cổng CI grep bundle chỉ chứng minh lập trình viên không gõ chuỗi cấm; nó mù
hoàn toàn với dòng bio mà lễ tân điền vào tuần nhập liệu 12–18/11 — đúng lúc
khách đang đọc trang để ký nghiệm thu.

Kịch bản cụ thể phải chặn: bio "Chứng chỉ Polestar, 8 năm kinh nghiệm" và
thông báo "Lớp tối đa 3 người — 2.500.000đ/10 buổi".
"""

from __future__ import annotations

import unicodedata

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import Role
from tests.conftest import auth_header, login, make_user


def _headers(client: TestClient, user) -> dict[str, str]:
    return auth_header(login(client, user.email)["access_token"])


# --- Hồ sơ HLV ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("bio", "expected_code"),
    [
        ("Chứng chỉ Polestar Pilates, 8 năm kinh nghiệm", "P3_CERTIFICATE"),
        ("Có bằng cấp quốc tế về Pilates", "P3_CERTIFICATE"),
        ("Hơn 10 năm kinh nghiệm giảng dạy", "P3_EXPERIENCE_YEARS"),
    ],
)
def test_trainer_bio_violating_content_rules_rejected(
    client: TestClient, db: Session, bio: str, expected_code: str
) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "HLV Demo 01", "bio": bio, "is_public": True},
    )
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["code"] == expected_code
    # 422 phải nói rõ luật nào bị vi phạm, không chỉ "không hợp lệ".
    assert "bio" in detail["message"]


def test_trainer_specialties_go_through_the_validator_too(
    client: TestClient, db: Session
) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "HLV Demo 01", "specialties": "Chứng chỉ Reformer"},
    )
    assert response.status_code == 422


def test_editing_a_trainer_cannot_sneak_content_in_later(
    client: TestClient, db: Session
) -> None:
    """Đường thật của rủi ro: hồ sơ tạo sạch, nội dung bịa thêm vào sau."""
    staff = make_user(db, Role.STAFF)
    headers = _headers(client, staff)
    trainer_id = client.post(
        "/trainers", headers=headers, json={"full_name": "HLV Demo 01"}
    ).json()["id"]

    response = client.patch(
        f"/trainers/{trainer_id}",
        headers=headers,
        json={"bio": "Chứng chỉ Polestar"},
    )
    assert response.status_code == 422


def test_clean_trainer_bio_is_accepted(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={
            "full_name": "HLV Demo 01",
            "bio": "Hướng dẫn Pilates cho người mới bắt đầu và người phục hồi sau chấn thương.",
            "is_public": True,
        },
    )
    assert response.status_code == 201


def test_trainer_bio_is_sanitized(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "HLV Demo 01", "bio": "<script>alert(1)</script>Dạy Pilates"},
    )
    assert response.status_code == 201
    assert response.json()["bio"] == "Dạy Pilates"


# --- Thông báo ---------------------------------------------------------------


@pytest.mark.parametrize(
    ("body", "expected_code"),
    [
        ("Lớp tối đa 3 người mỗi buổi", "P3_CLASS_SIZE_CLAIM"),
        ("Giờ mở cửa 7:30 - 19:30 mỗi ngày", "P3_OPENING_HOURS"),
        ("Doanh thu quý này tăng mạnh", "P3_BUSINESS_METRICS"),
    ],
)
def test_announcement_violating_content_rules_rejected(
    client: TestClient, db: Session, body: str, expected_code: str
) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/announcements",
        headers=_headers(client, staff),
        json={"title": "Thông báo", "body": body, "is_published": True},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == expected_code


def test_announcement_title_is_checked_as_well(client: TestClient, db: Session) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/announcements",
        headers=_headers(client, staff),
        json={"title": "Lớp tối đa 3 người", "body": "Nội dung bình thường.", "is_published": True},
    )
    assert response.status_code == 422


def test_legitimate_announcement_is_accepted(client: TestClient, db: Session) -> None:
    """Giá do studio công bố và buổi lớp đã xếp đều hợp lệ.

    Quy tắc là cấm *bịa*, không phải cấm giá. Nếu cổng chặn luôn cả hai thì nó
    đang chặn đúng thứ nó phải cho qua.
    """
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/announcements",
        headers=_headers(client, staff),
        json={
            "title": "Khuyến mãi gói 10 buổi",
            "body": "Gói Group 10 buổi: 2.500.000đ. Lớp thứ Ba 18:00 - 19:00 còn chỗ.",
            "is_published": True,
        },
    )
    assert response.status_code == 201


def test_announcement_body_keeps_whitelisted_markup_only(
    client: TestClient, db: Session
) -> None:
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/announcements",
        headers=_headers(client, staff),
        json={
            "title": "Thông báo",
            "body": "<p>Nội dung <strong>quan trọng</strong></p><img src=x onerror=alert(1)>",
            "is_published": True,
        },
    )
    assert response.status_code == 201
    body = response.json()["body"]
    assert "<strong>" in body
    assert "onerror" not in body


def test_violating_content_never_reaches_the_public_page(
    client: TestClient, db: Session
) -> None:
    """Kiểm đầu-cuối: nội dung bị chặn khi ghi thì trang công khai sạch."""
    staff = make_user(db, Role.STAFF)
    headers = _headers(client, staff)

    client.post(
        "/announcements",
        headers=headers,
        json={"title": "Thông báo", "body": "Lớp tối đa 3 người", "is_published": True},
    )
    client.post(
        "/trainers",
        headers=headers,
        json={"full_name": "HLV Demo 01", "bio": "Chứng chỉ Polestar", "is_public": True},
    )

    assert client.get("/public/announcements").json() == []
    assert client.get("/public/trainers").json() == []


def test_student_cannot_publish_announcements(client: TestClient, db: Session) -> None:
    user = make_user(db, Role.STUDENT, email="hv1@example.com")
    response = client.post(
        "/announcements",
        headers=_headers(client, user),
        json={"title": "Tự đăng", "body": "Nội dung.", "is_published": True},
    )
    assert response.status_code == 403


# --- Đường vòng qua cổng P3 (phát hiện khi review M2) ------------------------


def test_trainer_full_name_goes_through_the_validator(
    client: TestClient, db: Session
) -> None:
    """`full_name` là trường HLV lộ diện nhất trên trang công khai.

    Bỏ sót nó nghĩa là có một cửa để "Chứng chỉ Polestar" đi thẳng lên trang
    bằng cách nằm trong tên, trong khi `bio` thì bị gác.
    """
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "Chứng chỉ Polestar", "is_public": True},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "P3_CERTIFICATE"


def test_trainer_full_name_is_sanitized(client: TestClient, db: Session) -> None:
    """XSS lưu trữ qua tên HLV: FE render tên này trên trang marketing công khai."""
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "<script>alert(1)</script>HLV Demo 01", "is_public": True},
    )
    assert response.status_code == 201
    assert response.json()["full_name"] == "HLV Demo 01"
    assert "<script>" not in client.get("/public/trainers").text


@pytest.mark.parametrize(
    ("body", "label"),
    [
        ("Lớp tối đa <strong>3</strong> người", "thẻ xen giữa các từ"),
        ("Lớp tối<p>đa 3 người</p>", "thẻ cắt đôi một từ"),
        ("Lớp tối&nbsp;đa 3 người", "thực thể khoảng trắng"),
    ],
)
def test_markup_cannot_smuggle_forbidden_content(
    client: TestClient, db: Session, body: str, label: str
) -> None:
    """Kiểm P3 phải chạy trên **dạng người đọc nhìn thấy**, không phải dạng lưu.

    `Lớp tối đa <strong>3</strong> người` hiển thị nguyên câu bị cấm — chính
    câu trong tiêu chí nghiệm thu — nhưng regex chạy trên chuỗi còn thẻ thì
    không thấy gì.
    """
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/announcements",
        headers=_headers(client, staff),
        json={"title": "Thông báo", "body": body, "is_published": True},
    )
    assert response.status_code == 422, label


@pytest.mark.parametrize(
    ("bio", "label"),
    [
        ("Chứng​chỉ Polestar", "zero-width space"),
        ("Chứng­chỉ Polestar", "soft hyphen"),
        ("Chứng⁠chỉ Polestar", "word joiner"),
        (unicodedata.normalize("NFD", "Chứng chỉ Polestar"), "tổ hợp NFD"),
    ],
)
def test_invisible_characters_cannot_smuggle_forbidden_content(
    client: TestClient, db: Session, bio: str, label: str
) -> None:
    """Ký tự vô hình không chiếm chỗ nhưng cắt đôi được một từ.

    Người đọc thấy "Chứng chỉ Polestar"; regex chạy trên chuỗi thô thấy hai
    mảnh rời và cho qua.
    """
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "HLV Demo 01", "bio": bio, "is_public": True},
    )
    assert response.status_code == 422, label


def test_ampersand_is_stored_as_typed_not_as_entity(
    client: TestClient, db: Session
) -> None:
    """`nh3` escape `&` và `<` kể cả khi đã bóc sạch thẻ.

    Không giải mã lại thì `Reformer & Mat` được **lưu** thành
    `Reformer &amp; Mat` và khách đọc đúng chuỗi đó; mỗi lần sửa lại escape
    thêm một lớp.
    """
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/trainers",
        headers=_headers(client, staff),
        json={"full_name": "HLV Demo 01", "bio": "Reformer & Mat, giá dưới 5 triệu"},
    )
    assert response.status_code == 201
    assert response.json()["bio"] == "Reformer & Mat, giá dưới 5 triệu"


def test_field_empty_after_sanitize_returns_422_not_500(
    client: TestClient, db: Session
) -> None:
    """`<script>…</script>` qua `min_length=1` của Pydantic vì chuỗi gốc không rỗng.

    Làm sạch xong thì không còn gì, và ghi NULL vào cột NOT NULL biến một đầu
    vào đáng 422 thành 500.
    """
    staff = make_user(db, Role.STAFF)
    response = client.post(
        "/announcements",
        headers=_headers(client, staff),
        json={"title": "<script>alert(1)</script>", "body": "Nội dung bình thường."},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "EMPTY_AFTER_SANITIZE"
