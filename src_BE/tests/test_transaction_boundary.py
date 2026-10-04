"""A successful HTTP write must be committed before its response starts."""

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.domain.rules import Role
from app.main import app
from app.models.people import Student
from tests.conftest import auth_header, login, make_user


def test_created_student_visible_in_another_transaction_before_response_start(
    concurrent_client, db
):
    admin = make_user(db, Role.ADMIN)
    headers = auth_header(login(concurrent_client, admin.email)["access_token"])
    observed = []

    async def observe_response(scope, receive, send):
        async def observe_send(message):
            if message["type"] == "http.response.start" and message["status"] == 201:
                with SessionLocal() as reader:
                    observed.append(
                        reader.scalar(select(Student.id).where(Student.phone == "0912345678"))
                    )
            await send(message)

        await app(scope, receive, observe_send)

    with TestClient(observe_response) as client:
        response = client.post(
            "/students",
            headers=headers,
            json={"full_name": "E2E transaction", "phone": "0912345678"},
        )
    assert response.status_code == 201
    assert observed == [response.json()["id"]]
