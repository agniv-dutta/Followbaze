"""Shared pytest fixtures using an isolated in-memory SQLite database."""

from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("AUTO_CREATE_TABLES", "false")
os.environ.setdefault("APP_ENV", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app import models  # noqa: F401  (register models on metadata)

API = "/api/v1"


@pytest.fixture()
def db_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session: Session) -> TestClient:
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def create_lead(client: TestClient):
    def _create(**overrides):
        payload = {"name": "Ada Lovelace"}
        payload.update(overrides)
        response = client.post(f"{API}/leads", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _create
