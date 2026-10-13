"""Timezone helpers and the single source of truth for follow-up classification.

Follow-up states are mutually exclusive so the dashboard can place a lead in
exactly one bucket without duplicating rows:

* ``unscheduled`` – no ``next_follow_up_at``.
* ``overdue``     – scheduled instant is strictly before *now*.
* ``due_today``   – scheduled instant is in the future and falls within today's
                    local calendar day.
* ``upcoming``    – scheduled instant is after today's local calendar day.

Overdue detection compares real instants (never date-only values) so a future
appointment can never be flagged overdue. Calendar boundaries are computed in
the configured application timezone so midnight transitions behave correctly.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

FOLLOW_UP_UNSCHEDULED = "unscheduled"
FOLLOW_UP_OVERDUE = "overdue"
FOLLOW_UP_DUE_TODAY = "due_today"
FOLLOW_UP_UPCOMING = "upcoming"

UTC = timezone.utc


def get_timezone(name: str) -> ZoneInfo:
    """Return a ``ZoneInfo`` for ``name``, falling back to UTC when unknown."""

    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def ensure_aware(value: datetime) -> datetime:
    """Attach UTC to a naive datetime (a no-op for aware values)."""

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def to_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return ensure_aware(value).astimezone(UTC)


def classify_follow_up(
    next_follow_up_at: datetime | None,
    now: datetime,
    tz: ZoneInfo,
) -> str:
    """Classify a follow-up timestamp into one of the four states above."""

    if next_follow_up_at is None:
        return FOLLOW_UP_UNSCHEDULED

    scheduled = ensure_aware(next_follow_up_at)
    reference = ensure_aware(now)

    local_now = reference.astimezone(tz)
    start_of_today = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_tomorrow = start_of_today + timedelta(days=1)

    if scheduled < reference:
        return FOLLOW_UP_OVERDUE
    if start_of_today <= scheduled < start_of_tomorrow:
        return FOLLOW_UP_DUE_TODAY
    return FOLLOW_UP_UPCOMING
