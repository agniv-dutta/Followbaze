"""Health-check endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.db.base import utcnow

router = APIRouter(tags=["health"])


@router.get("/health", summary="Service health check")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
        "time": utcnow().isoformat(),
    }
