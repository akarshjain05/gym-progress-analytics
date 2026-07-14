import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # DATABASE_URL: postgres in production (Render), sqlite for local dev/tests.
    # Render's managed Postgres gives a URL starting with "postgres://" which
    # SQLAlchemy's psycopg2 driver needs as "postgresql://" - we normalize that.
    database_url: str = "sqlite:///./gym.db"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days

    # Comma-separated string, NOT list[str]. pydantic-settings parses env vars
    # for list/dict-typed fields as JSON by default (e.g. ["a","b"]), so a
    # plain comma-separated value like Render's CORS_ORIGINS env var would
    # crash on startup with a SettingsError. Splitting it ourselves in
    # cors_origins_list below avoids that entirely.
    cors_origins: str = "*"

    # Google Sign-In: OAuth client ID from Google Cloud Console. Required for
    # /auth/google to verify ID tokens. Leaving it blank disables Google
    # sign-in gracefully (returns a clear 500 instead of crashing).
    google_client_id: str = ""

    # Brevo (formerly Sendinblue) transactional email API for password reset
    # links. Uses HTTPS, not SMTP - deliberately, since Render (and many
    # cloud platforms) block or silently hang outbound SMTP connections on
    # their free tier as an anti-spam measure, which has no clean error and
    # just looks like the request hanging forever. If brevo_api_key is left
    # blank, reset links are printed to the server logs instead of emailed -
    # so local dev and tests don't need a real API key.
    brevo_api_key: str = ""
    brevo_sender_email: str = ""

    # Used to build the password reset link (e.g. https://x.onrender.com/reset-password.html)
    frontend_url: str = "http://127.0.0.1:8080"
    
    initial_admin_username: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

if settings.database_url.startswith("postgres://"):
    settings.database_url = settings.database_url.replace("postgres://", "postgresql://", 1)