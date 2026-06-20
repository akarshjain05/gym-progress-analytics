from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas, models
from ..config import settings
from ..database import get_db
from ..email_utils import send_password_reset_email
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


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
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
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    # user.password_hash can be None for an account that signed up with
    # Google but never finished choosing a username/password - `not user.password_hash`
    # short-circuits before verify_password ever sees a None hash.
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=schemas.GoogleLoginOut)
def google_login(payload: schemas.GoogleLoginIn, db: Session = Depends(get_db)):
    google_data = verify_google_id_token(payload.id_token)
    google_id = google_data["sub"]
    email = google_data["email"]

    user = db.query(models.User).filter(models.User.google_id == google_id).first()

    if not user:
        # Not seen this Google account before - if the email already belongs
        # to an existing account (e.g. they originally signed up with a
        # username/password), link Google to it instead of creating a
        # duplicate. Otherwise, create a new pending account.
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
        # Brand new account (or a previous Google sign-in that never finished
        # setup) - they must choose a username/password before they can log
        # in normally. We do NOT issue a real access token yet.
        setup_token = create_setup_token(google_id)
        return {"needs_setup": True, "setup_token": setup_token, "email": user.email}

    access_token = create_access_token(data={"sub": user.username})
    return {"needs_setup": False, "access_token": access_token, "token_type": "bearer"}


@router.post("/complete-google-signup", response_model=schemas.Token)
def complete_google_signup(payload: schemas.CompleteGoogleSignupIn, db: Session = Depends(get_db)):
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
def forgot_password(payload: schemas.ForgotPasswordIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Only send a reset link if the account actually has a password to reset
    # (a pending Google sign-up doesn't have one yet - they should use
    # "Sign in with Google" instead). Either way, return the exact same
    # response so the endpoint can't be used to discover which emails are
    # registered.
    if user and user.password_hash:
        raw_token, hashed_token = generate_reset_token()
        user.reset_token_hash = hashed_token
        user.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        db.commit()

        reset_link = f"{settings.frontend_url}/reset-password.html?token={raw_token}"
        send_password_reset_email(user.email, reset_link)

    return {"message": "If that email is registered, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordIn, db: Session = Depends(get_db)):
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