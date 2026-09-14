"""Tự sửa hồ sơ phải đúng chủ sở hữu và đồng bộ hồ sơ liên kết."""

import pytest

from app.domain.rules import Role
from app.models.people import Student, Trainer
from app.models.user import User
from tests.conftest import auth_header, login, make_user
from tests.factories import make_student_account, make_trainer


@pytest.mark.parametrize("role", list(Role))
def test_updates_own_name_and_phone_and_linked_profile(db, client, role):
    profile = None
    if role is Role.STUDENT:
        profile, user = make_student_account(db)
    else:
        user = make_user(db, role)
        if role is Role.TRAINER:
            profile = make_trainer(db, user=user)
    other = make_user(db, Role.STAFF, email="other-profile@example.com")
    original_email = user.email
    original_other_name = other.full_name
    headers = auth_header(login(client, user.email)["access_token"])
    response = client.patch(
        "/auth/me", headers=headers, json={"full_name": "Học viên Demo 01", "phone": "0900 777 666"}
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["full_name"] == "Học viên Demo 01"
    assert body["phone"] == "0900777666"
    assert body["email"] == original_email
    assert body["role"] == role.value
    db.expire_all()
    stored = db.get(User, user.id)
    assert (stored.full_name, stored.phone) == ("Học viên Demo 01", "0900777666")
    assert db.get(User, other.id).full_name == original_other_name
    if profile is not None:
        model = Student if role is Role.STUDENT else Trainer
        linked = db.get(model, profile.id)
        assert (linked.full_name, linked.phone) == (stored.full_name, stored.phone)
    assert client.get("/auth/me", headers=headers).json() == body
    assert login(client, original_email)["access_token"]


@pytest.mark.parametrize(
    "field,value",
    [
        ("role", "ADMIN"),
        ("student_id", 999),
        ("user_id", 999),
        ("email", "other@example.com"),
        ("is_active", False),
        ("id", 999),
    ],
)
def test_rejects_changes_to_identity_and_permissions(db, client, field, value):
    student, user = make_student_account(db)
    original = user.full_name
    headers = auth_header(login(client, user.email)["access_token"])
    response = client.patch(
        "/auth/me", headers=headers, json={"full_name": "Đổi nhầm", field: value}
    )
    assert response.status_code == 422
    db.expire_all()
    assert user.full_name == original
    assert user.role is Role.STUDENT
    assert student.user_id == user.id


def test_duplicate_student_phone_rolls_back_name_and_phone(db, client):
    student, user = make_student_account(db)
    other, _ = make_student_account(db, email="other-student@example.com")
    original = (student.full_name, student.phone, user.full_name, user.phone)
    headers = auth_header(login(client, user.email)["access_token"])
    response = client.patch(
        "/auth/me", headers=headers, json={"full_name": "Tên mới", "phone": other.phone}
    )
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "STUDENT_PHONE_TAKEN"
    db.expire_all()
    assert (student.full_name, student.phone, user.full_name, user.phone) == original


@pytest.mark.parametrize(
    "payload",
    [
        {"full_name": None},
        {"full_name": " "},
        {"phone": None},
        {"phone": " - "},
        {"full_name": "a" * 121},
        {"phone": "1" * 33},
    ],
)
def test_invalid_student_profile_does_not_change_data(db, client, payload):
    student, user = make_student_account(db)
    original = (student.full_name, student.phone)
    headers = auth_header(login(client, user.email)["access_token"])
    response = client.patch("/auth/me", headers=headers, json=payload)
    assert response.status_code == 422, response.text
    db.expire_all()
    assert (student.full_name, student.phone) == original


def test_staff_can_clear_optional_phone_without_changing_name(db, client):
    user = make_user(db, Role.STAFF)
    user.full_name = "Nhân viên"
    user.phone = "0900777666"
    db.commit()
    headers = auth_header(login(client, user.email)["access_token"])
    response = client.patch("/auth/me", headers=headers, json={"phone": None})
    assert response.status_code == 200
    assert response.json()["phone"] is None
    assert response.json()["full_name"] == "Nhân viên"


def test_unlinked_student_cannot_update_a_missing_profile(db, client):
    user = make_user(db, Role.STUDENT)
    headers = auth_header(login(client, user.email)["access_token"])
    assert (
        client.patch("/auth/me", headers=headers, json={"full_name": "Tên mới"}).status_code == 403
    )


def test_anonymous_and_locked_accounts_cannot_update_profile(db, client):
    user = make_user(db, Role.STAFF)
    headers = auth_header(login(client, user.email)["access_token"])
    assert client.patch("/auth/me", json={"full_name": "Tên mới"}).status_code == 401
    user.is_active = False
    db.commit()
    assert (
        client.patch("/auth/me", headers=headers, json={"full_name": "Tên mới"}).status_code == 401
    )
