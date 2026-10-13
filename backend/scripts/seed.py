"""Repeatable demo-data seed for LeadFlow.

Usage (from the ``backend`` directory)::

    python -m scripts.seed            # idempotent: skips existing seed leads
    python -m scripts.seed --reset    # delete ALL leads, then reseed

Dates are generated relative to the run time in the configured application
timezone so the demo stays meaningful on any day. Re-running without ``--reset``
never creates duplicate leads (seed leads are matched by name).
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta

from app.core.config import get_settings
from app.core.timezone import get_timezone
from app.db.base import Base, utcnow
from app.db.session import SessionLocal, engine
from app.models import Discussion, Lead
from app.models.enums import LeadStatus


def _build_seed_plan(now_local: datetime) -> list[dict]:
    """Return the demo dataset with timestamps relative to ``now_local``.

    Relative (not absolute) timestamps keep the overdue / due-today / upcoming
    states correct no matter what time or day the seed is executed.
    """

    def ago(days: int = 0, hours: int = 0) -> datetime:
        return now_local - timedelta(days=days, hours=hours)

    def ahead(days: int = 0, hours: int = 0) -> datetime:
        return now_local + timedelta(days=days, hours=hours)

    # Guarantee the "due today" item remains inside today's local calendar,
    # even when the seed runs late in the evening.
    due_today = ahead(hours=2)
    if due_today.date() != now_local.date():
        due_today = ahead(hours=2) if now_local.hour < 21 else now_local + timedelta(minutes=5)

    return [
        {
            "name": "Nadia Rahman",
            "company": "Northwind Traders",
            "phone": "+91 98200 11223",
            "status": LeadStatus.NEW,
            "next_follow_up_at": None,  # no scheduled follow-up
            "discussions": [],  # no discussions
        },
        {
            "name": "Omar Sheikh",
            "company": "Crescent Logistics",
            "phone": "+971 50 123 4567",
            "status": LeadStatus.CONTACTED,
            "next_follow_up_at": ago(days=1, hours=2),  # yesterday -> overdue
            "discussions": [
                ("Intro call: interested in the annual plan.", ago(days=3)),
                ("Sent pricing sheet; awaiting internal review.", ago(days=1)),
            ],
        },
        {
            "name": "Priya Nair",
            "company": "Bluewave Analytics",
            "phone": "+91 90000 44556",
            "status": LeadStatus.QUALIFIED,
            "next_follow_up_at": due_today,  # later today -> due today
            "discussions": [  # multiple discussions
                ("Discovery call: 12 seats, needs SSO.", ago(days=5)),
                ("Demo went well, technical questions answered.", ago(days=2)),
                ("Follow-up scheduled for later today.", ago(hours=1)),
            ],
        },
        {
            "name": "Rahul Verma",
            "company": "Vertex Manufacturing",
            "phone": "+91 98111 22334",
            "status": LeadStatus.PROPOSAL_SENT,
            "next_follow_up_at": ahead(days=3),  # upcoming
            "discussions": [
                ("Proposal sent for the enterprise tier.", ago(days=1)),
            ],
        },
        {
            "name": "Sofia Martinez",
            "company": "Lumen Retail",
            "phone": "+34 600 123 456",
            "status": LeadStatus.WON,
            "next_follow_up_at": None,
            "discussions": [
                ("Contract signed. Onboarding starts next week.", ago(days=4)),
            ],
        },
        {
            "name": "Chen Wei",
            "company": "Orbit Media",
            "phone": "+65 8123 4567",
            "status": LeadStatus.LOST,
            "next_follow_up_at": ago(days=2),  # overdue
            "discussions": [
                ("Went with a competitor on price.", ago(days=6)),
            ],
        },
    ]


def seed(reset: bool = False) -> int:
    settings = get_settings()
    tz = get_timezone(settings.app_timezone)
    now_local = datetime.now(tz)

    Base.metadata.create_all(bind=engine)

    created = 0
    db = SessionLocal()
    try:
        if reset:
            # Deleting leads cascades to discussions (see FK ondelete=CASCADE).
            for lead in db.query(Lead).all():
                db.delete(lead)
            db.commit()

        for entry in _build_seed_plan(now_local):
            if db.query(Lead).filter(Lead.name == entry["name"]).first() is not None:
                continue  # idempotent: never duplicate an existing seed lead

            lead = Lead(
                name=entry["name"],
                company=entry["company"],
                phone=entry["phone"],
                status=entry["status"],
                next_follow_up_at=entry["next_follow_up_at"],
            )
            db.add(lead)
            db.flush()  # assign lead.id for discussions

            for note, created_at in entry["discussions"]:
                db.add(
                    Discussion(
                        lead_id=lead.id,
                        note=note,
                        created_at=created_at,
                    )
                )
            created += 1

        db.commit()
    finally:
        db.close()

    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed LeadFlow demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete all existing leads (and their discussions) before seeding.",
    )
    args = parser.parse_args()

    created = seed(reset=args.reset)
    print(f"Seed complete. {created} lead(s) created at {utcnow().isoformat()}.")


if __name__ == "__main__":
    main()
