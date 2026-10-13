"""Canonical sales-pipeline statuses shared by models and schemas.

These are the exact string values required by the product specification. They
represent pipeline stages, **not** follow-up completion, so a ``Won`` or ``Lost``
lead can still carry a scheduled follow-up.
"""

from __future__ import annotations

from enum import Enum


class LeadStatus(str, Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    QUALIFIED = "Qualified"
    PROPOSAL_SENT = "Proposal Sent"
    WON = "Won"
    LOST = "Lost"

    @classmethod
    def values(cls) -> list[str]:
        return [member.value for member in cls]


DEFAULT_STATUS = LeadStatus.NEW
