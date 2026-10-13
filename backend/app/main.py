"""FastAPI application factory."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import discussions, health, leads
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db import base as db_base
from app.db.session import engine
from app import models  # noqa: F401  (ensures models are registered on metadata)


def _init_database() -> None:
    """Development convenience only; migrations remain the source of truth."""

    db_base.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.auto_create_tables:
        _init_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    api_router = APIRouter(prefix=settings.api_v1_prefix)
    api_router.include_router(health.router)
    api_router.include_router(leads.router)
    api_router.include_router(discussions.router)
    app.include_router(api_router)

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "docs": "/docs"}

    return app


app = create_app()
