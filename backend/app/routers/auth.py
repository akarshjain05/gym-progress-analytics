from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import schemas, models
from ..config import settings
from ..database import get_db
from ..email_utils import send_password_reset_email
from ..rate_limiter import limiter
from ..security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_google_id_token,
    create_setup_token,
    decode_setup_token,
    generate_reset_token,
    hash_reset_token,
)
from ..demo_templates import create_demo_templates

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
    
    create_demo_templates(db, user.id)
    
    return user


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        or_(
            models.User.username == form_data.username,
            models.User.email == form_data.username
        )
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if user and user.locked_until and user.locked_until > now:
        minutes_left = int((user.locked_until - now).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Account is locked due to too many failed attempts. Try again in {minutes_left} minutes.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now + timedelta(minutes=15)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Account locked due to too many failed attempts. Try again in 15 minutes.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.failed_login_attempts > 0 or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()
    access_token = create_access_token(data={"sub": user.username})
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax",
        secure=not settings.frontend_url.startswith("http://localhost"),
        max_age=settings.access_token_expire_minutes * 60
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


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
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {"needs_setup": False, "access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


@router.post("/complete-google-signup")
@limiter.limit("5/minute")
def complete_google_signup(request: Request, response: Response, payload: schemas.CompleteGoogleSignupIn, db: Session = Depends(get_db)):
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

    create_demo_templates(db, user.id)

    access_token = create_access_token(data={"sub": user.username})
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax",
        secure=not settings.frontend_url.startswith("http://localhost"),
        max_age=settings.access_token_expire_minutes * 60
    )
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


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

    response_data = {"message": "If that email is registered, a password reset link has been sent."}
    
    # For demo/portfolio purposes: if no email service is configured, return the link
    # directly in the response so users can test the flow without checking Docker logs.
    if user and user.password_hash and not settings.brevo_api_key:
        response_data["reset_link"] = reset_link

    return response_data


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


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(payload: schemas.TokenRefreshIn, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    try:
        token_data = jwt.decode(payload.refresh_token, settings.secret_key, algorithms=[settings.algorithm])
        if token_data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        username = token_data.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        # Check blacklist
        is_blacklisted = db.query(models.BlacklistedToken).filter(models.BlacklistedToken.token == payload.refresh_token).first()
        if is_blacklisted:
            raise HTTPException(status_code=401, detail="Token has been revoked")
            
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        access_token = create_access_token(data={"sub": user.username})
        new_refresh_token = create_refresh_token(data={"sub": user.username})
        
        # Blacklist old refresh token to prevent reuse
        db.add(models.BlacklistedToken(token=payload.refresh_token))
        db.commit()
        
        return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

@router.post("/logout")
def logout(payload: schemas.TokenRefreshIn, response: Response, db: Session = Depends(get_db)):
    # Blacklist the refresh token
    is_blacklisted = db.query(models.BlacklistedToken).filter(models.BlacklistedToken.token == payload.refresh_token).first()
    if not is_blacklisted:
        db.add(models.BlacklistedToken(token=payload.refresh_token))
        db.commit()
    response.delete_cookie("access_token", httponly=True, samesite="lax")
    return {"message": "Logged out successfully"}
