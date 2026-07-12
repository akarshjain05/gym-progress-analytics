from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from .config import settings
from .database import get_db
from .models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Returns the full User ORM object (not just an id) so callers can do
    direct attribute access/comparisons, e.g. `current_user.username`."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        # google_setup tokens are a different, more limited kind of token (see
        # create_setup_token below) and must never be usable as a normal
        # access token, even though they're signed with the same secret.
        if payload.get("type") in ["google_setup", "refresh"]:
            raise credentials_exception
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


# ---------------------------------------------------------------------------
# Google Sign-In
# ---------------------------------------------------------------------------

def verify_google_id_token(token: str) -> dict:
    """
    Verifies a Google ID token (the `credential` returned by Google Identity
    Services in the frontend) and returns its decoded payload. This checks
    the token's signature against Google's public keys, its expiry, and that
    it was issued for OUR client ID specifically (audience check) - without
    that last check, a token meant for a completely different app could be
    replayed here.
    """
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google sign-in isn't configured on this server.")
    try:
        payload = google_id_token.verify_oauth2_token(
            token, google_requests.Request(), audience=settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired Google sign-in token.")

    if not payload.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Your Google account's email isn't verified.")
    if not payload.get("email") or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Google didn't return the expected account details.")
    return payload


def create_setup_token(google_id: str) -> str:
    """
    Short-lived token issued after a NEW Google sign-in, before the person
    has chosen a username/password. It encodes the verified Google account
    id (not a username, since none exists yet) and a "type" claim so
    get_current_user can never mistake it for a real access token.
    """
    return create_access_token(data={"sub": google_id, "type": "google_setup"}, expires_delta=timedelta(minutes=15))


def decode_setup_token(token: str) -> str:
    """Returns the Google account id embedded in a setup token, or raises
    a 400 if the token is invalid, expired, or not a setup token at all."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise HTTPException(status_code=400, detail="This sign-up link is invalid or has expired. Please sign in with Google again.")
    if payload.get("type") != "google_setup":
        raise HTTPException(status_code=400, detail="Invalid sign-up token.")
    return payload.get("sub")


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

def generate_reset_token() -> tuple[str, str]:
    """Returns (raw_token_for_the_emailed_link, sha256_hash_for_the_database).
    Only the hash is ever stored, same reasoning as password hashing - a
    database leak shouldn't hand out working reset links."""
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()