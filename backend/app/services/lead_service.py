"""Lead persistence and read-model assembly.

The dashboard needs each lead together with its latest discussion and total
discussion count. Instead of issuing one query per lead (N+1), we fetch all
leads in a single query and then resolve discussion metadata for the whole page
with two aggregated queries.
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Discussion, Lead
from app.models.enums import LeadStatus
from app.schemas.lead import DiscussionSummary, LeadCreate, LeadDetailRead, LeadRead, LeadUpdate


def _latest_discussion_subquery():
    row_number = func.row_number().over(
        partition_by=Discussion.lead_id,
        order_by=(Discussion.created_at.desc(), Discussion.id.desc()),
    ).label("rn")
    return select(
        Discussion.id.label("id"),
        Discussion.lead_id.label("lead_id"),
        Discussion.note.label("note"),
        Discussion.created_at.label("created_at"),
        row_number,
    ).subquery()


def _discussion_meta(db: Session, lead_ids: list[int]) -> dict[int, tuple[DiscussionSummary | None, int]]:
    """Return ``{lead_id: (latest_summary, count)}`` using two queries total."""

    meta: dict[int, tuple[DiscussionSummary | None, int]] = {lead_id: (None, 0) for lead_id in lead_ids}
    if not lead_ids:
        return meta

    latest_sub = _latest_discussion_subquery()
    latest_rows = db.execute(
        select(latest_sub.c.id, latest_sub.c.lead_id, latest_sub.c.note, latest_sub.c.created_at)
        .where(latest_sub.c.rn == 1, latest_sub.c.lead_id.in_(lead_ids))
    ).all()
    count_rows = db.execute(
        select(Discussion.lead_id, func.count(Discussion.id))
        .where(Discussion.lead_id.in_(lead_ids))
        .group_by(Discussion.lead_id)
    ).all()

    counts = {lead_id: count for lead_id, count in count_rows}
    for row in latest_rows:
        meta[row.lead_id] = (
            DiscussionSummary(id=row.id, note=row.note, created_at=row.created_at),
            counts.get(row.lead_id, 0),
        )
    return meta


def _to_read(lead: Lead, meta: dict[int, tuple[DiscussionSummary | None, int]]) -> LeadRead:
    latest, count = meta.get(lead.id, (None, 0))
    return LeadRead(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        phone=lead.phone,
        status=lead.status,
        next_follow_up_at=lead.next_follow_up_at,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        latest_discussion=latest,
        discussion_count=count,
    )


def serialize_lead(db: Session, lead: Lead) -> LeadRead:
    """Build a ``LeadRead`` for a single already-persisted lead."""

    meta = _discussion_meta(db, [lead.id])
    return _to_read(lead, meta)


def list_leads(
    db: Session,
    *,
    status: LeadStatus | None = None,
    search: str | None = None,
) -> list[LeadRead]:
    stmt = select(Lead)
    if status is not None:
        stmt = stmt.where(Lead.status == status)
    if search:
        term = search.strip()
        if term:
            stmt = stmt.where(Lead.name.ilike(f"%{term}%"))

    # Deterministic order: most recently active leads first, id as tiebreaker.
    stmt = stmt.order_by(Lead.updated_at.desc(), Lead.id.desc())

    leads = list(db.execute(stmt).scalars().all())
    meta = _discussion_meta(db, [lead.id for lead in leads])
    return [_to_read(lead, meta) for lead in leads]


def get_lead(db: Session, lead_id: int) -> Lead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise NotFoundError(f"Lead {lead_id} was not found.")
    return lead


def get_lead_detail(db: Session, lead_id: int) -> LeadDetailRead:
    lead = get_lead(db, lead_id)
    discussions = list(
        db.execute(
            select(Discussion)
            .where(Discussion.lead_id == lead_id)
            .order_by(Discussion.created_at.desc(), Discussion.id.desc())
        )
        .scalars()
        .all()
    )
    base = serialize_lead(db, lead)
    return LeadDetailRead(**base.model_dump(), discussions=discussions)


def create_lead(db: Session, payload: LeadCreate) -> Lead:
    lead = Lead(
        name=payload.name,
        company=payload.company,
        phone=payload.phone,
        status=payload.status,
    )
    db.add(lead)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(lead)
    return lead


def update_lead(db: Session, lead_id: int, payload: LeadUpdate) -> Lead:
    lead = get_lead(db, lead_id)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(lead, field, value)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    db.refresh(lead)
    return lead
