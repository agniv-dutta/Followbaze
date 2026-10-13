"""Pydantic schemas for discussion notes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import get_settings
from app.core.timezone import get_timezone
from app.schemas.validators import normalize_to_utc, strip_required


class DiscussionCreate(BaseModel):
    note: str = Field(min_length=1, max_length=5000)
    follow_up_at: datetime | None = None

    @field_validator("note")
    @classmethod
    def _validate_note(cls, value: str) -> str:
        return strip_required(value)

    @field_validator("follow_up_at")
    @classmethod
    def _normalize_follow_up(cls, value: datetime | None) -> datetime | None:
        return normalize_to_utc(value, get_timezone(get_settings().app_timezone))


class DiscussionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    created_at: datetime
