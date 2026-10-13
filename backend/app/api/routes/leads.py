"""Lead endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.enums import LeadStatus
from app.schemas.lead import LeadCreate, LeadDetailRead, LeadRead, LeadUpdate
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadRead], summary="List leads")
def list_leads(
    status_: LeadStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, description="Case-insensitive name search"),
    db: Session = Depends(get_db),
) -> list[LeadRead]:
    return lead_service.list_leads(db, status=status_, search=search)


@router.post(
    "",
    response_model=LeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lead",
)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)) -> LeadRead:
    lead = lead_service.create_lead(db, payload)
    return lead_service.serialize_lead(db, lead)


@router.get("/{lead_id}", response_model=LeadDetailRead, summary="Get a lead with history")
def get_lead(lead_id: int, db: Session = Depends(get_db)) -> LeadDetailRead:
    return lead_service.get_lead_detail(db, lead_id)


@router.patch("/{lead_id}", response_model=LeadRead, summary="Update a lead")
def update_lead(
    lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)
) -> LeadRead:
    lead = lead_service.update_lead(db, lead_id, payload)
    return lead_service.serialize_lead(db, lead)
