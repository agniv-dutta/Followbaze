"""SQLAlchemy ORM models for leads and discussions."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.db.types import UTCDateTime
from app.models.enums import DEFAULT_STATUS, LeadStatus


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[LeadStatus] = mapped_column(
        SAEnum(
            LeadStatus,
            name="lead_status",
            native_enum=False,
            length=20,
            create_constraint=True,
            validate_strings=True,
            values_callable=lambda enum: [member.value for member in enum],
        ),
        nullable=False,
        default=DEFAULT_STATUS,
        server_default=DEFAULT_STATUS.value,
        index=True,
    )
    next_follow_up_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    discussions: Mapped[list["Discussion"]] = relationship(
        back_populates="lead",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Discussion.created_at.desc(), Discussion.id.desc()",
    )

    __table_args__ = (
        Index("ix_leads_updated_at_id", "updated_at", "id"),
    )


class Discussion(Base):
    __tablename__ = "discussions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    note: Mapped[str] = mapped_column(String(5000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, nullable=False, default=utcnow
    )

    lead: Mapped[Lead] = relationship(back_populates="discussions")

    __table_args__ = (
        # Supports efficient reverse-chronological history retrieval per lead.
        Index("ix_discussions_lead_created_id", "lead_id", "created_at", "id"),
    )
