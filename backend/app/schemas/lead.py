"""Pydantic schemas for leads."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import LeadStatus
from app.schemas.discussion import DiscussionRead
from app.schemas.validators import strip_optional, strip_required, validate_phone


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    company: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    status: LeadStatus = LeadStatus.NEW

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        return strip_required(value)

    @field_validator("company")
    @classmethod
    def _validate_company(cls, value: str | None) -> str | None:
        return strip_optional(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return validate_phone(value)


class LeadUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    company: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    status: LeadStatus | None = None

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str | None) -> str:
        # An omitted name is skipped entirely; an explicit JSON null is invalid
        # because ``leads.name`` is NOT NULL. Rejecting it here yields a 422
        # instead of a late database IntegrityError.
        if value is None:
            raise ValueError("must not be null")
        return strip_required(value)

    @field_validator("status")
    @classmethod
    def _validate_status(cls, value: LeadStatus | None) -> LeadStatus:
        if value is None:
            raise ValueError("must not be null")
        return value

    @field_validator("company")
    @classmethod
    def _validate_company(cls, value: str | None) -> str | None:
        return strip_optional(value)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        return validate_phone(value)


class DiscussionSummary(BaseModel):
    """Compact latest-discussion payload for dashboard rows."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    note: str
    created_at: datetime


class LeadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: str | None
    phone: str | None
    status: LeadStatus
    next_follow_up_at: datetime | None
    created_at: datetime
    updated_at: datetime
    latest_discussion: DiscussionSummary | None = None
    discussion_count: int = 0


class LeadDetailRead(LeadRead):
    discussions: list[DiscussionRead] = Field(default_factory=list)
