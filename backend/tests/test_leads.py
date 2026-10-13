"""Lead CRUD, validation, search and filter tests."""

from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

API = "/api/v1"


def test_create_lead_defaults_to_new(client: TestClient) -> None:
    response = client.post(f"{API}/leads", json={"name": "Grace Hopper"})
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Grace Hopper"
    assert body["status"] == "New"
    assert body["company"] is None
    assert body["phone"] is None
    assert body["next_follow_up_at"] is None
    assert body["latest_discussion"] is None
    assert body["discussion_count"] == 0


def test_create_lead_trims_whitespace(client: TestClient) -> None:
    response = client.post(
        f"{API}/leads",
        json={"name": "  Alan Turing  ", "company": "  Bletchley  "},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Alan Turing"
    assert body["company"] == "Bletchley"


@pytest.mark.parametrize("bad_name", ["", "   ", "\t\n"])
def test_create_lead_rejects_blank_name(client: TestClient, bad_name: str) -> None:
    response = client.post(f"{API}/leads", json={"name": bad_name})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"


def test_create_lead_rejects_missing_name(client: TestClient) -> None:
    response = client.post(f"{API}/leads", json={"company": "No Name Inc"})
    assert response.status_code == 422


def test_create_lead_with_explicit_status(client: TestClient) -> None:
    response = client.post(
        f"{API}/leads", json={"name": "Barbara Liskov", "status": "Qualified"}
    )
    assert response.status_code == 201
    assert response.json()["status"] == "Qualified"


def test_create_lead_rejects_invalid_status(client: TestClient) -> None:
    response = client.post(
        f"{API}/leads", json={"name": "Invalid", "status": "Not A Status"}
    )
    assert response.status_code == 422


@pytest.mark.parametrize("phone", ["+91 98765 43210", "(555) 123-4567", "12345678"])
def test_create_lead_accepts_valid_phone(client: TestClient, phone: str) -> None:
    response = client.post(f"{API}/leads", json={"name": "Phone Lead", "phone": phone})
    assert response.status_code == 201
    assert response.json()["phone"] == phone


@pytest.mark.parametrize("phone", ["abc", "phone-number"])
def test_create_lead_rejects_bad_phone(client: TestClient, phone: str) -> None:
    response = client.post(f"{API}/leads", json={"name": "Bad Phone", "phone": phone})
    assert response.status_code == 422


def test_get_lead(client: TestClient, create_lead) -> None:
    lead = create_lead(name="Katherine Johnson")
    response = client.get(f"{API}/leads/{lead['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == lead["id"]
    assert body["discussions"] == []


def test_get_missing_lead_returns_404(client: TestClient) -> None:
    response = client.get(f"{API}/leads/9999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_update_lead_status_persists(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = client.patch(f"{API}/leads/{lead['id']}", json={"status": "Contacted"})
    assert response.status_code == 200
    assert response.json()["status"] == "Contacted"

    fetched = client.get(f"{API}/leads/{lead['id']}")
    assert fetched.json()["status"] == "Contacted"


def test_update_lead_rejects_invalid_status(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = client.patch(f"{API}/leads/{lead['id']}", json={"status": "Bogus"})
    assert response.status_code == 422


def test_update_missing_lead_returns_404(client: TestClient) -> None:
    response = client.patch(f"{API}/leads/424242", json={"status": "Won"})
    assert response.status_code == 404


def test_search_is_case_insensitive(client: TestClient, create_lead) -> None:
    create_lead(name="Grace Hopper")
    create_lead(name="Alan Turing")
    response = client.get(f"{API}/leads", params={"search": "grace"})
    assert response.status_code == 200
    names = [lead["name"] for lead in response.json()]
    assert names == ["Grace Hopper"]


def test_filter_by_status(client: TestClient, create_lead) -> None:
    create_lead(name="A", status="New")
    create_lead(name="B", status="Won")
    create_lead(name="C", status="Won")
    response = client.get(f"{API}/leads", params={"status": "Won"})
    names = sorted(lead["name"] for lead in response.json())
    assert names == ["B", "C"]


def test_filter_invalid_status_returns_422(client: TestClient) -> None:
    response = client.get(f"{API}/leads", params={"status": "Nope"})
    assert response.status_code == 422


def test_search_and_status_work_together(client: TestClient, create_lead) -> None:
    create_lead(name="Grace Hopper", status="Won")
    create_lead(name="Grace Kelly", status="New")
    create_lead(name="Alan Turing", status="Won")
    response = client.get(f"{API}/leads", params={"search": "grace", "status": "Won"})
    names = [lead["name"] for lead in response.json()]
    assert names == ["Grace Hopper"]
