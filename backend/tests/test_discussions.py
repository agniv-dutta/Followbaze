"""Discussion creation, ordering, atomic follow-up and validation tests."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Discussion

API = "/api/v1"


def _add_discussion(client: TestClient, lead_id: int, note: str, **extra):
    payload = {"note": note}
    payload.update(extra)
    return client.post(f"{API}/leads/{lead_id}/discussions", json=payload)


def test_create_discussion(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = _add_discussion(client, lead["id"], "Kickoff call completed")
    assert response.status_code == 201
    body = response.json()
    assert body["discussion"]["note"] == "Kickoff call completed"
    assert body["discussion"]["lead_id"] == lead["id"]
    assert body["lead"]["latest_discussion"]["note"] == "Kickoff call completed"
    assert body["lead"]["discussion_count"] == 1


def test_create_discussion_trims_note(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = _add_discussion(client, lead["id"], "  padded note  ")
    assert response.status_code == 201
    assert response.json()["discussion"]["note"] == "padded note"


def test_create_discussion_rejects_blank_note(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = _add_discussion(client, lead["id"], "   ")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_create_discussion_missing_lead_returns_404(client: TestClient) -> None:
    response = _add_discussion(client, 98765, "orphan")
    assert response.status_code == 404


def test_list_discussions_missing_lead_returns_404(client: TestClient) -> None:
    response = client.get(f"{API}/leads/98765/discussions")
    assert response.status_code == 404


def test_discussions_returned_in_reverse_chronological_order(
    client: TestClient, create_lead
) -> None:
    lead = create_lead()
    for note in ["First", "Second", "Third"]:
        _add_discussion(client, lead["id"], note)

    response = client.get(f"{API}/leads/{lead['id']}/discussions")
    assert response.status_code == 200
    notes = [item["note"] for item in response.json()]
    assert notes == ["Third", "Second", "First"]


def test_discussion_order_uses_id_as_deterministic_tiebreaker(
    client: TestClient, create_lead, db_session: Session
) -> None:
    lead = create_lead()
    for note in ["A", "B", "C"]:
        _add_discussion(client, lead["id"], note)

    # Collapse all timestamps to force the id tiebreaker to decide the order.
    same_instant = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    for discussion in db_session.execute(select(Discussion)).scalars():
        discussion.created_at = same_instant
    db_session.commit()

    response = client.get(f"{API}/leads/{lead['id']}/discussions")
    notes = [item["note"] for item in response.json()]
    assert notes == ["C", "B", "A"]


def test_follow_up_is_set_atomically_with_discussion(
    client: TestClient, create_lead
) -> None:
    lead = create_lead()
    follow_up = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    response = _add_discussion(client, lead["id"], "Proposal sent", follow_up_at=follow_up)
    assert response.status_code == 201

    returned_follow_up = response.json()["lead"]["next_follow_up_at"]
    assert returned_follow_up is not None

    fetched = client.get(f"{API}/leads/{lead['id']}")
    assert fetched.json()["next_follow_up_at"] == returned_follow_up


def test_existing_follow_up_preserved_without_new_follow_up(
    client: TestClient, create_lead
) -> None:
    lead = create_lead()
    first_follow_up = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    created = _add_discussion(
        client, lead["id"], "Set reminder", follow_up_at=first_follow_up
    )
    scheduled = created.json()["lead"]["next_follow_up_at"]

    # Add a plain note without a follow-up; the reminder must survive.
    second = _add_discussion(client, lead["id"], "Just a note")
    assert second.status_code == 201
    assert second.json()["lead"]["next_follow_up_at"] == scheduled


def test_new_discussion_becomes_latest_on_dashboard(
    client: TestClient, create_lead
) -> None:
    lead = create_lead()
    _add_discussion(client, lead["id"], "Old note")
    _add_discussion(client, lead["id"], "Newest note")

    response = client.get(f"{API}/leads")
    row = next(item for item in response.json() if item["id"] == lead["id"])
    assert row["latest_discussion"]["note"] == "Newest note"
    assert row["discussion_count"] == 2


def test_naive_follow_up_is_interpreted_in_app_timezone(
    client: TestClient, create_lead
) -> None:
    lead = create_lead()
    # No offset -> interpreted as Asia/Kolkata (UTC+05:30) then stored as UTC.
    response = _add_discussion(
        client, lead["id"], "Local time", follow_up_at="2026-06-01T09:00:00"
    )
    assert response.status_code == 201
    stored = response.json()["lead"]["next_follow_up_at"]
    assert stored == "2026-06-01T03:30:00Z"
