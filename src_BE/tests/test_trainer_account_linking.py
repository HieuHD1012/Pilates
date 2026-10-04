"""Trainer login links must fail as business errors, never FK/unique 500s."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.rules import Role
from tests.conftest import auth_header, login, make_user


def test_trainer_link_validates_role_missing_account_and_duplicate(client: TestClient, db: Session):
    admin = make_user(db, Role.ADMIN)
    trainer_user = make_user(db, Role.TRAINER)
    student_user = make_user(db, Role.STUDENT)
    headers = auth_header(login(client, admin.email)["access_token"])
    profile = client.post("/trainers", headers=headers, json={"full_name": "E2E HLV"})
    assert profile.status_code == 201
    path = f"/trainers/{profile.json()['id']}"
    assert client.patch(path, headers=headers, json={"user_id": 99999999}).status_code == 404
    assert client.patch(path, headers=headers, json={"user_id": student_user.id}).status_code == 409
    assert client.patch(path, headers=headers, json={"user_id": trainer_user.id}).status_code == 200
    duplicate = client.post(
        "/trainers", headers=headers, json={"full_name": "E2E khác", "user_id": trainer_user.id}
    )
    assert duplicate.status_code == 409
    assert client.get(path, headers=headers).json()["user_id"] == trainer_user.id
    assert client.patch(path, headers=headers, json={"user_id": None}).status_code == 200
    assert client.get(path, headers=headers).json()["user_id"] is None


def test_null_nonnullable_trainer_flag_is_validation_error(client: TestClient, db: Session):
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(client, admin.email)["access_token"])
    profile = client.post("/trainers", headers=headers, json={"full_name": "E2E HLV"}).json()
    for field in ("is_public", "is_active"):
        response = client.patch(f"/trainers/{profile['id']}", headers=headers, json={field: None})
        assert response.status_code == 422
