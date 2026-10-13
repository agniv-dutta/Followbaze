"""Probe tests written during the correctness audit.

These assert the *correct* behaviour for edge cases that the original suite did
not cover. They are intentionally written against the specification, not the
current implementation, so any failure here indicates a real defect.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

API = "/api/v1"


def test_patch_null_status_is_rejected_not_500(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = client.patch(f"{API}/leads/{lead['id']}", json={"status": None})
    assert response.status_code == 422, response.text


def test_patch_null_name_is_rejected_not_500(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = client.patch(f"{API}/leads/{lead['id']}", json={"name": None})
    assert response.status_code == 422, response.text


def test_failed_patch_does_not_poison_connection(client: TestClient, create_lead) -> None:
    lead = create_lead()
    bad = client.patch(f"{API}/leads/{lead['id']}", json={"status": None})
    assert bad.status_code == 422, bad.text
    # The very next request must still work on a clean session.
    ok = client.get(f"{API}/leads/{lead['id']}")
    assert ok.status_code == 200
    assert ok.json()["status"] == "New"


def test_non_integer_lead_id_returns_422(client: TestClient) -> None:
    response = client.get(f"{API}/leads/not-an-int")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
