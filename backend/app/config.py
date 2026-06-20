import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # DATABASE_URL: postgres in production (Render), sqlite for local dev/tests.
    # Render's managed Postgres gives a URL starting with "postgres://" which
    # SQLAlchemy's psycopg2 driver needs as "postgresql://" - we normalize that.
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./gym.db")

    secret_key: str = os.environ.get("SECRET_KEY", "dev-secret-change-me-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

    cors_origins: list[str] = os.environ.get("CORS_ORIGINS", "*").split(",")

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()

if settings.database_url.startswith("postgres://"):
    settings.database_url = settings.database_url.replace("postgres://", "postgresql://", 1)
