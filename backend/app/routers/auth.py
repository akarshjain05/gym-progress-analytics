from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas, models
from ..config import settings
from ..database import get_db
from ..email_utils import send_password_reset_email
from ..main import limiter
from ..security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_google_id_token,
    create_setup_token,
    decode_setup_token,
    generate_reset_token,
    hash_reset_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Rate limits:
#   /auth/login           — 10 per minute per IP  (brute force protection)
#   /auth/register        — 5 per minute per IP   (spam account creation)
#   /auth/forgot-password — 3 per minute per IP   (email flood protection)
#   /auth/google          — 10 per minute per IP
#   /auth/reset-password  — 5 per minute per IP
#
# These limits are generous enough that a real user will never hit them.
# A bot hammering the endpoint will be blocked after the first few attempts.
# ---------------------------------------------------------------------------

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        if existing.google_id and existing.username is None:
            raise HTTPException(
                status_code=400,
                detail="This email is linked to a Google sign-in that hasn't been finished yet. "
                       "Use 'Sign in with Google' to finish setting up your account.",
            )
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=schemas.GoogleLoginOut)
@limiter.limit("10/minute")
def google_login(request: Request, payload: schemas.GoogleLoginIn, db: Session = Depends(get_db)):
    google_data = verify_google_id_token(payload.id_token)
    google_id = google_data["sub"]
    email = google_data["email"]

    user = db.query(models.User).filter(models.User.google_id == google_id).first()

    if not user:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.google_id = google_id
            db.commit()
            db.refresh(user)
        else:
            user = models.User(email=email, google_id=google_id, username=None, password_hash=None)
            db.add(user)
            db.commit()
            db.refresh(user)

    if user.username is None:
        setup_token = create_setup_token(google_id)
        return {"needs_setup": True, "setup_token": setup_token, "email": user.email}

    access_token = create_access_token(data={"sub": user.username})
    return {"needs_setup": False, "access_token": access_token, "token_type": "bearer"}


@router.post("/complete-google-signup", response_model=schemas.Token)
@limiter.limit("5/minute")
def complete_google_signup(request: Request, payload: schemas.CompleteGoogleSignupIn, db: Session = Depends(get_db)):
    google_id = decode_setup_token(payload.setup_token)

    user = db.query(models.User).filter(models.User.google_id == google_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Account not found. Please sign in with Google again.")
    if user.username is not None:
        raise HTTPException(status_code=400, detail="This account is already fully set up - just log in normally.")

    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user.username = payload.username
    user.password_hash = hash_password(payload.password)
    db.commit()

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: schemas.ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if user and user.password_hash:
        raw_token, hashed_token = generate_reset_token()
        user.reset_token_hash = hashed_token
        user.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        db.commit()

        reset_link = f"{settings.frontend_url}/reset-password.html?token={raw_token}"
        send_password_reset_email(user.email, reset_link)

    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: schemas.ResetPasswordIn, db: Session = Depends(get_db)):
    hashed = hash_reset_token(payload.token)
    user = db.query(models.User).filter(models.User.reset_token_hash == hashed).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not user or not user.reset_token_expires or user.reset_token_expires < now:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a new one.")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successful. You can now log in with your new password."}