"""Application configuration loaded exclusively from environment variables.

Keeping every tunable here avoids sprinkling os.environ access across the code
base and keeps tests able to override behaviour by constructing a fresh
``Settings`` instance / overriding the cached provider.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Followbaze API"
    app_version: str = "1.0.0"
    app_env: str = "development"
    debug: bool = False

    api_v1_prefix: str = "/api/v1"

    # SQLite by default for local development. Any SQLAlchemy URL is accepted.
    database_url: str = "sqlite:///./followbaze.db"

    # Comma separated list of allowed browser origins.
    cors_origins: str = "http://localhost:3000"

    # Timezone used for "due today" calendar grouping and default seed values.
    app_timezone: str = "Asia/Kolkata"

    log_level: str = "INFO"

    # Development convenience: create tables on startup when no migrations have
    # been applied yet. Migrations remain the source of truth (used in Docker).
    auto_create_tables: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
