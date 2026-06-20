import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # DATABASE_URL: postgres in production (Render), sqlite for local dev/tests.
    # Render's managed Postgres gives a URL starting with "postgres://" which
    # SQLAlchemy's psycopg2 driver needs as "postgresql://" - we normalize that.
    database_url: str = "sqlite:///./gym.db"

    secret_key: str = "dev-secret-change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # Comma-separated string, NOT list[str]. pydantic-settings parses env vars
    # for list/dict-typed fields as JSON by default (e.g. ["a","b"]), so a
    # plain comma-separated value like Render's CORS_ORIGINS env var would
    # crash on startup with a SettingsError. Splitting it ourselves in
    # cors_origins_list below avoids that entirely.
    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

if settings.database_url.startswith("postgres://"):
    settings.database_url = settings.database_url.replace("postgres://", "postgresql://", 1)
