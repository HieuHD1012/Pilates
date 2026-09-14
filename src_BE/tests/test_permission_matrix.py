"""Ma trận phân quyền trên mọi endpoint quản lý.

Hai điều được khẳng định, và điều thứ hai quan trọng hơn: mỗi vai **được phép**
làm gì, và mỗi vai **bị từ chối** cái gì. Một bộ test chỉ kiểm nhánh được phép
sẽ xanh nguyên vẹn trên một hệ thống cho mọi người xem mọi thứ.

Ngoài bảng vai × endpoint còn ba đường vòng phải bịt: gọi thẳng API bằng id của
người khác, HLV thao tác trên lớp không phải của mình, và token của một tài
khoản vừa bị khoá.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.rules import Role, now
from app.models.people import Student
from app.models.user import User
from tests.conftest import auth_header, login, make_user
from tests.factories import (
    give_package,
    make_session,
    make_student,
    make_student_account,
    make_trainer,
)

#: (đường dẫn, các vai **được** vào). Vai không có tên trong danh sách phải
#: nhận 403 — đó là nửa dễ quên của ma trận.
READ_MATRIX = [
    ("/renewals", {Role.ADMIN, Role.STAFF}),
    ("/renewals/summary", {Role.ADMIN, Role.STAFF}),
    ("/reports/dashboard", {Role.ADMIN, Role.STAFF}),
    ("/reports/revenue", {Role.ADMIN, Role.STAFF}),
    ("/reports/classes", {Role.ADMIN, Role.STAFF}),
    ("/reports/trainers", {Role.ADMIN, Role.STAFF}),
    ("/reports/unconfirmed-payments", {Role.ADMIN, Role.STAFF}),
    ("/bookings", {Role.ADMIN, Role.STAFF}),
    ("/students", {Role.ADMIN, Role.STAFF, Role.STUDENT}),
    ("/classes", {Role.ADMIN, Role.STAFF, Role.TRAINER, Role.STUDENT}),
]


#: Endpoint cần id trong đường dẫn hoặc tham số — dựng được sau khi có dữ liệu,
#: nên nằm ở một bảng riêng thay vì hằng số module. Bỏ chúng ra ngoài ma trận là
#: cách một endpoint mất phép kiểm quyền mà cả bộ test vẫn xanh.
def _parameterised_matrix(student_id: int, class_session_id: int) -> list[tuple]:
    return [
        (f"/my-schedule?student_id={student_id}", {Role.ADMIN, Role.STAFF, Role.STUDENT}),
        (
            f"/my-schedule/bookable?student_id={student_id}",
            {Role.ADMIN, Role.STAFF, Role.STUDENT},
        ),
        ("/reports/revenue/detail", {Role.ADMIN, Role.STAFF}),
        ("/reports/trainers/export?format=csv", {Role.ADMIN, Role.STAFF}),
        (f"/renewals/students/{student_id}/contacts", {Role.ADMIN, Role.STAFF}),
    ]


@pytest.fixture
def tokens(db: Session, client: TestClient) -> dict[Role, str]:
    """Một tài khoản cho mỗi vai, hồ sơ nghiệp vụ đã nối đầy đủ."""
    admin = make_user(db, Role.ADMIN)
    staff = make_user(db, Role.STAFF, email="staff-matrix@example.com")
    trainer_user = make_user(db, Role.TRAINER, email="trainer-matrix@example.com")
    make_trainer(db, "HLV Ma Trận", user=trainer_user)
    student, student_user = make_student_account(
        db, "Học viên Ma Trận", "student-matrix@example.com"
    )
    give_package(db, student, admin.id, credits=5)
    db.commit()
    return {
        Role.ADMIN: login(client, admin.email)["access_token"],
        Role.STAFF: login(client, staff.email)["access_token"],
        Role.TRAINER: login(client, trainer_user.email)["access_token"],
        Role.STUDENT: login(client, student_user.email)["access_token"],
    }


@pytest.mark.parametrize(("path", "allowed"), READ_MATRIX)
def test_every_role_gets_the_documented_answer(
    client: TestClient, tokens, path: str, allowed: set[Role]
) -> None:
    for role, token in tokens.items():
        response = client.get(path, headers=auth_header(token))
        if role in allowed:
            assert response.status_code == 200, f"{role} → {path}: {response.text}"
        else:
            assert response.status_code == 403, f"{role} → {path}: {response.status_code}"


@pytest.mark.parametrize(("path", "_allowed"), READ_MATRIX)
def test_no_management_endpoint_answers_without_a_token(
    client: TestClient, path: str, _allowed: set[Role]
) -> None:
    assert client.get(path).status_code == 401


def test_endpoints_taking_an_id_answer_the_same_way(
    db: Session, client: TestClient, tokens
) -> None:
    """Nửa còn lại của ma trận: các đường dẫn mang id.

    Học viên đọc lịch **của chính mình** thì được; HLV không có phần trong màn
    này. Các endpoint vận hành còn lại chỉ dành cho nhân viên.
    """
    admin = make_user(db, Role.ADMIN, email="admin-matrix-id@example.com")
    trainer = make_trainer(db, "HLV Có Lớp")
    class_session = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    student_id = db.scalar(
        select(Student.id)
        .join(User, User.id == Student.user_id)
        .where(User.email == "student-matrix@example.com")
    )
    db.commit()

    for path, allowed in _parameterised_matrix(student_id, class_session.id):
        for role, token in tokens.items():
            response = client.get(path, headers=auth_header(token))
            if role in allowed:
                assert response.status_code == 200, f"{role} → {path}: {response.text}"
            else:
                assert response.status_code == 403, f"{role} → {path}: {response.status_code}"


def test_recording_a_renewal_contact_is_staff_only(db: Session, client: TestClient, tokens) -> None:
    student_id = db.scalar(
        select(Student.id)
        .join(User, User.id == Student.user_id)
        .where(User.email == "student-matrix@example.com")
    )
    payload = {"student_id": student_id, "result": "Đã gọi, khách hẹn lại"}

    for role in (Role.STUDENT, Role.TRAINER):
        response = client.post(
            "/renewals/contacts", json=payload, headers=auth_header(tokens[role])
        )
        assert response.status_code == 403, f"{role}: {response.status_code}"

    response = client.post(
        "/renewals/contacts", json=payload, headers=auth_header(tokens[Role.STAFF])
    )
    assert response.status_code == 201, response.text


# --- Đi vòng bằng id của người khác ------------------------------------------


def test_a_student_cannot_read_another_students_schedule(
    db: Session, client: TestClient, tokens
) -> None:
    """Tham số `student_id` đoán được bằng cách tăng dần, nên nó phải vô dụng."""
    someone_else = make_student(db, "Học viên Khác")
    db.commit()

    response = client.get(
        "/my-schedule",
        params={"student_id": someone_else.id},
        headers=auth_header(tokens[Role.STUDENT]),
    )
    assert response.status_code == 403


def test_a_student_cannot_book_using_another_students_identity(
    db: Session, client: TestClient, tokens
) -> None:
    admin = make_user(db, Role.ADMIN, email="admin-owner@example.com")
    trainer = make_trainer(db, "HLV Lớp Chung")
    someone_else = make_student(db, "Người Bị Mượn Gói")
    their_package = give_package(db, someone_else, admin.id, credits=5)
    class_session = make_session(db, trainer, admin.id, starts_at=now() + timedelta(days=1))
    db.commit()

    response = client.post(
        "/bookings",
        json={"class_session_id": class_session.id, "student_id": someone_else.id},
        headers=auth_header(tokens[Role.STUDENT]),
    )
    assert response.status_code == 403

    # Và cũng không mượn được gói của người đó cho chính mình.
    response = client.post(
        "/bookings",
        json={
            "class_session_id": class_session.id,
            "student_package_id": their_package.id,
        },
        headers=auth_header(tokens[Role.STUDENT]),
    )
    assert response.status_code == 404


def test_a_trainer_cannot_act_on_a_class_they_do_not_teach(
    db: Session, client: TestClient, tokens
) -> None:
    admin = make_user(db, Role.ADMIN, email="admin-other-class@example.com")
    other_trainer = make_trainer(db, "HLV Của Lớp Kia")
    student = make_student(db, "Học viên Lớp Kia")
    give_package(db, student, admin.id, credits=5)
    class_session = make_session(db, other_trainer, admin.id, starts_at=now() + timedelta(days=1))
    db.commit()

    response = client.post(
        "/bookings",
        json={"class_session_id": class_session.id, "student_id": student.id},
        headers=auth_header(tokens[Role.TRAINER]),
    )
    assert response.status_code == 403


def test_waitlist_routes_are_removed(client: TestClient, tokens) -> None:
    for token in tokens.values():
        headers = auth_header(token)
        assert (
            client.post("/waitlist", headers=headers, json={"class_session_id": 1}).status_code
            == 404
        )
        assert client.post("/waitlist/1/promote", headers=headers).status_code == 404
        assert client.get("/waitlist/pending", headers=headers).status_code == 404


def test_locking_an_account_invalidates_the_tokens_already_issued(
    db: Session, client: TestClient
) -> None:
    """Khoá tài khoản phải có hiệu lực **ngay**, không phải từ lần đăng nhập sau.

    JWT vô trạng thái nên access token đã phát vẫn hợp lệ về mặt chữ ký; phép
    kiểm `is_active` ở mỗi request là thứ chặn nó. Và refresh token phải chết
    theo — nếu không, người vừa bị khoá tự phát cho mình access token mới, và
    thao tác khoá chỉ là một dòng chữ trên màn hình.
    """
    admin = make_user(db, Role.ADMIN, email="admin-lock@example.com")
    locked = make_user(db, Role.STAFF, email="sap-bi-khoa@example.com")
    db.commit()

    session = login(client, locked.email)
    access, refresh = session["access_token"], session["refresh_token"]
    assert client.get("/students", headers=auth_header(access)).status_code == 200

    admin_token = login(client, admin.email)["access_token"]
    response = client.post(f"/accounts/{locked.id}/lock", headers=auth_header(admin_token))
    assert response.status_code == 200, response.text

    assert client.get("/students", headers=auth_header(access)).status_code == 401
    assert client.post("/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_updating_a_profile_cannot_silently_swallow_an_unknown_field(
    db: Session, client: TestClient
) -> None:
    """Sửa hồ sơ mà gửi kèm `is_active` phải **báo lỗi**, không nhận rồi bỏ qua.

    Nhận nhầm là cách tệ nhất: màn hình quản trị hiện "đã lưu", người dùng tin
    rằng tài khoản đã khoá, và nó vẫn mở. Khoá tài khoản có đường riêng, nơi
    refresh token cũng bị thu hồi.
    """
    admin = make_user(db, Role.ADMIN, email="admin-patch@example.com")
    other = make_user(db, Role.STAFF, email="ho-so@example.com")
    db.commit()

    token = login(client, admin.email)["access_token"]
    response = client.patch(
        f"/accounts/{other.id}",
        json={"full_name": "Tên Mới", "is_active": False},
        headers=auth_header(token),
    )
    assert response.status_code == 422

    response = client.patch(
        f"/accounts/{other.id}",
        json={"full_name": "Tên Mới"},
        headers=auth_header(token),
    )
    assert response.status_code == 200, response.text
    assert response.json()["full_name"] == "Tên Mới"
