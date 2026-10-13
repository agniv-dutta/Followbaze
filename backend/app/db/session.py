"""Database engine, session factory and the SQLite foreign-key pragma hook."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

_connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    """SQLite ignores foreign keys unless explicitly enabled per connection."""

    module_name = type(dbapi_connection).__module__
    if "sqlite" not in module_name:
        return
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped database session."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
