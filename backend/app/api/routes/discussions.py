"""Discussion endpoints, nested under leads."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.discussion import DiscussionCreate, DiscussionRead
from app.schemas.responses import DiscussionCreateResponse
from app.services import discussion_service, lead_service

router = APIRouter(prefix="/leads", tags=["discussions"])


@router.get(
    "/{lead_id}/discussions",
    response_model=list[DiscussionRead],
    summary="List a lead's discussion history",
)
def list_discussions(lead_id: int, db: Session = Depends(get_db)) -> list[DiscussionRead]:
    return discussion_service.list_discussions(db, lead_id)


@router.post(
    "/{lead_id}/discussions",
    response_model=DiscussionCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a discussion note (optionally scheduling a follow-up)",
)
def create_discussion(
    lead_id: int, payload: DiscussionCreate, db: Session = Depends(get_db)
) -> DiscussionCreateResponse:
    discussion, lead = discussion_service.create_discussion(db, lead_id, payload)
    return DiscussionCreateResponse(
        discussion=DiscussionRead.model_validate(discussion),
        lead=lead_service.serialize_lead(db, lead),
    )
