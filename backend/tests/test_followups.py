"""Follow-up classification tests — the correctness-critical area."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.timezone import (
    FOLLOW_UP_DUE_TODAY,
    FOLLOW_UP_OVERDUE,
    FOLLOW_UP_UNSCHEDULED,
    FOLLOW_UP_UPCOMING,
    classify_follow_up,
    get_timezone,
)

API = "/api/v1"

IST = get_timezone("Asia/Kolkata")

# A stable local reference instant: 15 Jan 2026, 10:00 IST.
NOW = datetime(2026, 1, 15, 10, 0, tzinfo=IST)


def test_unscheduled_when_no_follow_up() -> None:
    assert classify_follow_up(None, NOW, IST) == FOLLOW_UP_UNSCHEDULED


def test_previous_day_is_overdue() -> None:
    scheduled = NOW - timedelta(days=1)
    assert classify_follow_up(scheduled, NOW, IST) == FOLLOW_UP_OVERDUE


def test_earlier_today_is_overdue() -> None:
    scheduled = NOW.replace(hour=1, minute=0)  # 01:00 IST, still before 10:00
    assert classify_follow_up(scheduled, NOW, IST) == FOLLOW_UP_OVERDUE


def test_later_today_is_due_today() -> None:
    scheduled = NOW.replace(hour=15, minute=30)  # 15:30 IST today
    assert classify_follow_up(scheduled, NOW, IST) == FOLLOW_UP_DUE_TODAY


def test_future_appointment_is_not_overdue() -> None:
    scheduled = NOW + timedelta(minutes=30)
    assert classify_follow_up(scheduled, NOW, IST) == FOLLOW_UP_DUE_TODAY


def test_tomorrow_is_upcoming() -> None:
    scheduled = NOW + timedelta(days=1)
    assert classify_follow_up(scheduled, NOW, IST) == FOLLOW_UP_UPCOMING


def test_midnight_boundary_uses_local_calendar() -> None:
    # 20:00Z on the 15th is 01:30 IST on the 16th.
    now_utc = datetime(2026, 1, 15, 20, 0, tzinfo=timezone.utc)
    # 21:00Z -> 02:30 IST on the 16th: same local day, in the future.
    scheduled = datetime(2026, 1, 15, 21, 0, tzinfo=timezone.utc)
    assert classify_follow_up(scheduled, now_utc, IST) == FOLLOW_UP_DUE_TODAY


def test_overdue_uses_instant_not_calendar_day() -> None:
    # 19:00Z is 00:30 IST on the 16th — same local day as "now" but already past.
    now_utc = datetime(2026, 1, 15, 20, 0, tzinfo=timezone.utc)
    scheduled = datetime(2026, 1, 15, 19, 0, tzinfo=timezone.utc)
    assert classify_follow_up(scheduled, now_utc, IST) == FOLLOW_UP_OVERDUE


def test_naive_timestamp_is_treated_as_utc() -> None:
    naive = datetime(2026, 1, 20, 10, 0)
    assert classify_follow_up(naive, NOW, IST) == FOLLOW_UP_UPCOMING


def test_unknown_timezone_falls_back_to_utc() -> None:
    tz = get_timezone("Not/AZone")
    assert str(tz) in {"UTC", "Etc/UTC"}


def test_api_round_trip_follow_up_classification(client: TestClient, create_lead) -> None:
    lead = create_lead()
    future = datetime.now(IST) + timedelta(days=5)
    response = client.post(
        f"{API}/leads/{lead['id']}/discussions",
        json={"note": "Schedule", "follow_up_at": future.isoformat()},
    )
    assert response.status_code == 201
    returned = response.json()["lead"]["next_follow_up_at"]
    parsed = datetime.fromisoformat(returned)
    assert classify_follow_up(parsed, datetime.now(timezone.utc), IST) == FOLLOW_UP_UPCOMING
