"""Boot the API for end-to-end tests against a freshly reset SQLite database.

Used by Playwright's ``webServer`` so E2E runs never touch the development
database. Set ``E2E_BACKEND_PORT`` to change the port (default 8010).
"""

from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite:///./e2e.db")
os.environ.setdefault("AUTO_CREATE_TABLES", "true")

_db_url = os.environ["DATABASE_URL"]
if _db_url.startswith("sqlite"):
    # e.g. sqlite:///./e2e.db -> ./e2e.db
    db_path = Path(_db_url.split("sqlite:///", 1)[-1])
    if db_path.exists():
        db_path.unlink()

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app import models  # noqa: E402,F401

Base.metadata.create_all(bind=engine)

import uvicorn  # noqa: E402

if __name__ == "__main__":
    port = int(os.environ.get("E2E_BACKEND_PORT", "8010"))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")
