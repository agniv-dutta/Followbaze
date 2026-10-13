"""Reusable Pydantic validators."""

from __future__ import annotations

import re
from datetime import datetime, timezone

# Deliberately permissive: accepts international numbers with +, spaces,
# dashes, dots and parentheses while rejecting obvious junk.
_PHONE_ALLOWED = re.compile(r"^\+?[0-9()\-.\s]{5,30}$")
_HAS_DIGIT = re.compile(r"\d")


def strip_required(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


def strip_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def validate_phone(value: str | None) -> str | None:
    value = strip_optional(value)
    if value is None:
        return None
    if not _PHONE_ALLOWED.match(value) or not _HAS_DIGIT.search(value):
        raise ValueError("must be a valid phone number")
    return value


def normalize_to_utc(value: datetime | None, fallback_tz) -> datetime | None:
    """Return an aware UTC datetime; naive input is interpreted in ``fallback_tz``."""

    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=fallback_tz)
    return value.astimezone(timezone.utc)
