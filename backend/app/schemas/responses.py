"""Composite response schemas that combine multiple resources."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.discussion import DiscussionRead
from app.schemas.lead import LeadRead


class DiscussionCreateResponse(BaseModel):
    """Returned by ``POST /leads/{id}/discussions``.

    Bundles the created discussion with the updated lead so the client can
    refresh both the timeline and dashboard in a single round trip.
    """

    discussion: DiscussionRead
    lead: LeadRead
