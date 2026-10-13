"""Audit regression tests.

Edge cases from the correctness audit that the original suite did not cover.
Written against the specification so a failure indicates a real defect.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models import Discussion, Lead
from app.models.enums import LeadStatus
from app.schemas.discussion import DiscussionCreate
from app.services import discussion_service

API = "/api/v1"


# --- Error handling: explicit nulls must be a 422, never a 500 ---------------


def test_patch_null_status_is_rejected_not_500(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = client.patch(f"{API}/leads/{lead['id']}", json={"status": None})
    assert response.status_code == 422, response.text


def test_patch_null_name_is_rejected_not_500(client: TestClient, create_lead) -> None:
    lead = create_lead()
    response = client.patch(f"{API}/leads/{lead['id']}", json={"name": None})
    assert response.status_code == 422, response.text


def test_patch_completely_omitted_fields_is_a_noop(client: TestClient, create_lead) -> None:
    lead = create_lead(name="Untouched", status="New")
    response = client.patch(f"{API}/leads/{lead['id']}", json={})
    assert response.status_code == 200
    assert response.json()["name"] == "Untouched"
    assert response.json()["status"] == "New"


def test_patch_nullable_company_can_be_cleared(client: TestClient, create_lead) -> None:
    lead = create_lead(company="Acme")
    response = client.patch(f"{API}/leads/{lead['id']}", json={"company": None})
    assert response.status_code == 200
    assert response.json()["company"] is None


def test_failed_patch_does_not_poison_connection(client: TestClient, create_lead) -> None:
    lead = create_lead()
    bad = client.patch(f"{API}/leads/{lead['id']}", json={"status": None})
    assert bad.status_code == 422, bad.text
    # The very next request must still succeed on a clean session.
    ok = client.get(f"{API}/leads/{lead['id']}")
    assert ok.status_code == 200
    assert ok.json()["status"] == "New"


def test_non_integer_lead_id_returns_422(client: TestClient) -> None:
    response = client.get(f"{API}/leads/not-an-int")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


# --- Persistence: status must survive a full engine/connection restart --------


def test_status_persists_across_engine_restart(tmp_path) -> None:
    url = f"sqlite:///{tmp_path / 'persist.db'}"

    def open_session() -> tuple[object, Session]:
        engine = create_engine(
            url, connect_args={"check_same_thread": False}, future=True
        )
        Base.metadata.create_all(bind=engine)
        return engine, sessionmaker(bind=engine, autoflush=False, autocommit=False)()

    engine1, session1 = open_session()
    lead = Lead(name="Restart Me", status=LeadStatus.CONTACTED)
    session1.add(lead)
    session1.commit()
    lead_id = lead.id
    session1.close()
    engine1.dispose()

    # Simulate an application restart: brand-new engine, new pool, new session.
    engine2, session2 = open_session()
    reloaded = session2.get(Lead, lead_id)
    assert reloaded.status == LeadStatus.CONTACTED
    reloaded.status = LeadStatus.WON
    session2.commit()
    session2.close()
    engine2.dispose()

    engine3, session3 = open_session()
    assert session3.get(Lead, lead_id).status == LeadStatus.WON
    session3.close()
    engine3.dispose()


# --- Database-level integrity: the CHECK constraint must reject junk ---------


def test_db_check_constraint_rejects_invalid_status(
    client: TestClient, create_lead, db_session: Session
) -> None:
    lead = create_lead()
    with pytest.raises(IntegrityError):
        db_session.execute(
            text("UPDATE leads SET status = 'Bogus' WHERE id = :id"),
            {"id": lead["id"]},
        )
        db_session.commit()
    db_session.rollback()


# --- Atomicity: a failed write must leave neither row behind ------------------


def test_create_discussion_rolls_back_atomically_on_failure(
    client: TestClient, create_lead, db_session: Session
) -> None:
    lead = create_lead()
    assert db_session.get(Lead, lead["id"]).next_follow_up_at is None
    follow_up = datetime.now(timezone.utc) + timedelta(days=2)

    with patch.object(db_session, "commit", side_effect=SQLAlchemyError("boom")):
        with pytest.raises(SQLAlchemyError):
            discussion_service.create_discussion(
                db_session,
                lead["id"],
                DiscussionCreate(note="Should not persist", follow_up_at=follow_up),
            )

    # Neither the discussion nor the follow-up change may survive the rollback.
    assert db_session.execute(
        select(func.count()).select_from(Discussion)
    ).scalar_one() == 0
    refreshed = db_session.get(Lead, lead["id"])
    db_session.refresh(refreshed)
    assert refreshed.next_follow_up_at is None


def test_bare_note_preserves_follow_up_in_database(
    client: TestClient, create_lead, db_session: Session
) -> None:
    lead = create_lead()
    scheduled = datetime.now(timezone.utc) + timedelta(days=4)
    discussion_service.create_discussion(
        db_session, lead["id"], DiscussionCreate(note="sets reminder", follow_up_at=scheduled)
    )

    computed = db_session.get(Lead, lead["id"]).next_follow_up_at
    assert computed is not None

    discussion_service.create_discussion(
        db_session, lead["id"], DiscussionCreate(note="plain follow-up note")
    )

    db_session.expire_all()
    preserved = db_session.get(Lead, lead["id"]).next_follow_up_at
    assert preserved == computed
