"""OpenAPI must describe binary consumers as bytes with their actual media types."""

import pytest

from app.main import app


@pytest.mark.parametrize(
    "path,media_types",
    [
        ("/public/trainer-photos/{prefix}/{key}", {"image/jpeg"}),
        ("/trainers/{trainer_id}/photo", {"image/jpeg"}),
        ("/students/{student_id}/progress-photos/{photo_id}/file", {"image/jpeg"}),
        (
            "/reports/trainers/export",
            {"text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        ),
        (
            "/reports/trainers/class-sizes/export",
            {"text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        ),
    ],
)
def test_binary_response_media_contract(path, media_types):
    response = app.openapi()["paths"][path]["get"]["responses"]["200"]
    assert set(response["content"]) == media_types
    assert all(
        entry["schema"] == {"type": "string", "format": "binary"}
        for entry in response["content"].values()
    )
    if path.endswith("/export"):
        assert "Content-Disposition" in response["headers"]
