"""Custom SQLAlchemy type handling SQLite's lack of timezone support.

SQLite stores datetimes as naive strings and drops any offset information.
``UTCDateTime`` normalises every value to naive-UTC on the way in and re-attaches
UTC on the way out, so the rest of the application can always assume
timezone-aware UTC datetimes regardless of the backend.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, _dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, _dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
