"""Health endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

API = "/api/v1"


def test_health_ok(client: TestClient) -> None:
    response = client.get(f"{API}/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "time" in body
