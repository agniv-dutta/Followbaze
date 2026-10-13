"""Discussion persistence with atomic follow-up updates."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models import Discussion, Lead
from app.schemas.discussion import DiscussionCreate
from app.services import lead_service


def list_discussions(db: Session, lead_id: int) -> list[Discussion]:
    lead_service.get_lead(db, lead_id)  # raises 404 for a missing parent
    return list(
        db.execute(
            select(Discussion)
            .where(Discussion.lead_id == lead_id)
            .order_by(Discussion.created_at.desc(), Discussion.id.desc())
        )
        .scalars()
        .all()
    )


def create_discussion(
    db: Session, lead_id: int, payload: DiscussionCreate
) -> tuple[Discussion, Lead]:
    """Create a discussion and (optionally) update the lead's follow-up.

    Both writes happen inside a single transaction. When ``follow_up_at`` is not
    supplied the existing ``next_follow_up_at`` is left untouched, so adding a
    bare note never clears a scheduled reminder.
    """

    lead = lead_service.get_lead(db, lead_id)

    try:
        discussion = Discussion(lead_id=lead.id, note=payload.note)
        db.add(discussion)
        if payload.follow_up_at is not None:
            lead.next_follow_up_at = payload.follow_up_at
        # Reflect the activity in ordering without touching the follow-up field.
        lead.updated_at = utcnow()
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

    db.refresh(discussion)
    db.refresh(lead)
    return discussion, lead
