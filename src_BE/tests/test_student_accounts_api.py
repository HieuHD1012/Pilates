"""Admin cấp/nối tài khoản học viên, có kiểm giao dịch và quyền."""

from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.rules import Role
from app.models.people import Student
from app.models.user import User
from tests.conftest import TEST_PASSWORD, auth_header, login, make_user
from tests.factories import make_student


def _payload(student_id: int | None, email: str = "new-student@example.com") -> dict:
    return {
        "email": email,
        "role": "STUDENT",
        "student_id": student_id,
        "password": TEST_PASSWORD,
    }


def test_admin_creates_linked_student_account(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])
    student = client.post(
        "/students", headers=headers, json={"full_name": "Lan", "phone": "0901000099"}
    ).json()
    response = client.post("/accounts", headers=headers, json=_payload(student["id"]))
    assert response.status_code == 201, response.text
    tokens = login(client, "new-student@example.com")
    me = client.get("/auth/me", headers=auth_header(tokens["access_token"]))
    assert me.json()["student_id"] == student["id"]
    profile = client.get(f"/students/{student['id']}", headers=headers).json()
    assert profile["user_id"] == response.json()["id"]
    assert (
        client.get("/my-schedule", headers=auth_header(tokens["access_token"])).status_code == 200
    )


def test_activation_email_sent_after_student_is_linked(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    student = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    payload = _payload(student.id)
    del payload["password"]
    observed = []

    def sent(email, raw_token):
        db.expire_all()
        observed.append(db.get(Student, student.id).user_id)
        assert email == payload["email"]
        assert raw_token

    with patch("app.api.accounts.send_password_reset", side_effect=sent):
        response = client.post("/accounts", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["status"] == "PENDING_ACTIVATION"
    assert observed == [response.json()["id"]]


@pytest.mark.parametrize("role", [Role.STAFF, Role.TRAINER, Role.STUDENT, None])
def test_only_admin_can_grant_account(client: TestClient, db: Session, role) -> None:
    student = make_student(db)
    headers = {}
    if role:
        user = make_user(db, role)
        headers = auth_header(login(client, user.email)["access_token"])
    response = client.post("/accounts", headers=headers, json=_payload(student.id))
    assert response.status_code == (403 if role else 401)
    assert db.scalar(select(User.id).where(User.email == "new-student@example.com")) is None


@pytest.mark.parametrize(
    "case", ["missing", "unknown", "wrong_role", "already_linked", "email_taken"]
)
def test_invalid_grant_leaves_no_orphan_account(client: TestClient, db: Session, case: str) -> None:
    admin = make_user(db, Role.ADMIN)
    student = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    payload = _payload(student.id)
    expected = (422, "STUDENT_REQUIRED")
    if case == "missing":
        del payload["student_id"]
    elif case == "unknown":
        payload["student_id"] = 99999
        expected = (404, "NOT_FOUND")
    elif case == "wrong_role":
        payload["role"] = "TRAINER"
        expected = (422, "ACCOUNT_ROLE_MISMATCH")
    elif case == "already_linked":
        old = make_user(db, Role.STUDENT)
        student.user_id = old.id
        db.commit()
        expected = (409, "STUDENT_HAS_ACCOUNT")
    elif case == "email_taken":
        make_user(db, Role.STAFF, email=payload["email"])
        expected = (422, "EMAIL_TAKEN")
    count = db.scalar(select(func.count()).select_from(User))
    response = client.post("/accounts", headers=headers, json=payload)
    assert (response.status_code, response.json()["detail"]["code"]) == expected
    db.expire_all()
    assert db.scalar(select(func.count()).select_from(User)) == count
    assert db.get(Student, student.id).user_id == (old.id if case == "already_linked" else None)


def test_admin_repairs_existing_unlinked_account_without_reassigning(
    client: TestClient, db: Session
):
    admin = make_user(db, Role.ADMIN)
    user = make_user(db, Role.STUDENT)
    student = make_student(db)
    other = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    response = client.patch(
        f"/accounts/{user.id}", headers=headers, json={"student_id": student.id}
    )
    assert response.status_code == 200, response.text
    me = client.get("/auth/me", headers=auth_header(login(client, user.email)["access_token"]))
    assert me.json()["student_id"] == student.id
    for payload, code in [
        ({"student_id": other.id}, "ACCOUNT_ALREADY_LINKED"),
        ({"student_id": None}, "STUDENT_REQUIRED"),
        ({"role": "TRAINER"}, "ACCOUNT_ROLE_MISMATCH"),
        ({"role": None}, "ACCOUNT_ROLE_MISMATCH"),
    ]:
        response = client.patch(f"/accounts/{user.id}", headers=headers, json=payload)
        assert response.json()["detail"]["code"] == code
        assert response.status_code in (409, 422)


def test_parallel_grants_create_one_account(concurrent_client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    student = make_student(db)
    headers = auth_header(login(concurrent_client, admin.email)["access_token"])
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(
                concurrent_client.post,
                "/accounts",
                headers=headers,
                json=_payload(student.id, f"new{i}@example.com"),
            )
            for i in range(2)
        ]
        responses = [future.result(timeout=15) for future in futures]
    assert sorted(response.status_code for response in responses) == [201, 409]
    assert db.scalar(select(func.count()).select_from(User).where(User.role == Role.STUDENT)) == 1
    db.expire_all()
    assert db.get(Student, student.id).user_id is not None


def test_changing_role_to_student_requires_profile(client: TestClient, db: Session) -> None:
    admin = make_user(db, Role.ADMIN)
    user = make_user(db, Role.STAFF)
    student = make_student(db)
    headers = auth_header(login(client, admin.email)["access_token"])
    response = client.patch(f"/accounts/{user.id}", headers=headers, json={"role": "STUDENT"})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "STUDENT_REQUIRED"
    response = client.patch(
        f"/accounts/{user.id}",
        headers=headers,
        json={"role": "STUDENT", "student_id": student.id},
    )
    assert response.status_code == 200, response.text
    me = client.get("/auth/me", headers=auth_header(login(client, user.email)["access_token"]))
    assert me.json()["student_id"] == student.id
