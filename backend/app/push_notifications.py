"""
push_notifications.py — Web Push Notification Router

Endpoints:
  POST /push/subscribe      — save a push subscription for the current user
  DELETE /push/unsubscribe  — remove push subscription
  POST /push/test           — send a test notification to current user

Background jobs (called from scheduler or finish_workout):
  notify_new_pr(db, user_id, exercise_name, new_1rm_kg)
  notify_inactivity(db)  — called daily, checks users inactive 3+ days
"""

import json
import os
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Session, relationship

from .database import Base, get_db
from .security import get_current_user
from . import models

router = APIRouter(prefix="/push", tags=["push"])

# ---------------------------------------------------------------------------
# Model — store one subscription per user (last registered device wins)
# ---------------------------------------------------------------------------

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)   # public key
    auth = Column(Text, nullable=False)      # auth secret

    user = relationship("User")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: SubscriptionKeys



def _send_push(subscription: PushSubscription, title: str, body: str, url: str = "/workout.html") -> tuple[bool, str]:
    """
    Send a Web Push notification using pywebpush.
    Returns (True, "") on success, (False, reason) on failure.

    VAPID_PRIVATE_KEY must be the raw base64url-encoded EC private key
    as produced by `npx web-push generate-vapid-keys`.
    """
    vapid_private_key_str = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    vapid_claims_email = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@ironlog.app")

    if not vapid_private_key_str:
        return False, "VAPID_PRIVATE_KEY not set in environment"

    try:
        from pywebpush import webpush, WebPushException

        payload = json.dumps({"title": title, "body": body, "url": url})
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=payload,
            vapid_private_key=vapid_private_key_str,
            vapid_claims={"sub": vapid_claims_email},
        )
        return True, ""
    except ImportError as e:
        return False, f"Missing dependency: {e}"
    except Exception as e:
        print(f"[push] Failed to send to user {subscription.user_id}: {e}")
        return False, str(e)


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.post("/subscribe", status_code=201)
def subscribe(
    payload: PushSubscriptionIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Save or update the push subscription for the current user."""
    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).first()

    if existing:
        existing.endpoint = payload.endpoint
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
        )
        db.add(sub)

    db.commit()
    return {"status": "subscribed"}


@router.delete("/unsubscribe", status_code=204)
def unsubscribe(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove the push subscription for the current user."""
    sub = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return None


@router.post("/test")
def send_test(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Send a test notification to the current user."""
    sub = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No push subscription found. Enable notifications first.")

    ok, reason = _send_push(sub, "IRONLOG Test", "Push notifications are working!", "/dashboard.html")
    if not ok:
        raise HTTPException(
            status_code=503,
            detail=f"Push notification failed: {reason}"
        )
    return {"status": "sent"}


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Return the VAPID public key so the frontend can subscribe."""
    key = os.getenv("VAPID_PUBLIC_KEY", "").strip()
    private_key = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    # Only return the key if both are configured
    if key and private_key:
        return {"public_key": key, "configured": True}
    return {"public_key": "", "configured": False}


# ---------------------------------------------------------------------------
# Notification triggers — called from other routers
# ---------------------------------------------------------------------------

def notify_new_pr(db: Session, user_id: int, exercise_name: str, new_1rm_kg: float):
    """Send a PR notification. Called from workout_templates finish endpoint."""
    sub = db.query(PushSubscription).filter(
        PushSubscription.user_id == user_id
    ).first()
    if not sub:
        return
    ok, _ = _send_push(
        sub,
        title="New PR!",
        body=f"You just hit a new {exercise_name} record: {new_1rm_kg}kg est. 1RM!",
        url="/lifts.html",
    )


def notify_inactivity_check(db: Session):
    """
    Check all users. If they haven't logged a workout in 3+ days, send a reminder.
    Call this from a daily cron/scheduler endpoint.
    """
    three_days_ago = date.today() - timedelta(days=3)
    subs = db.query(PushSubscription).all()

    for sub in subs:
        latest_log = (
            db.query(models.LiftLog)
            .filter(models.LiftLog.user_id == sub.user_id)
            .order_by(models.LiftLog.date.desc())
            .first()
        )
        if latest_log is None or latest_log.date <= three_days_ago:
            days_ago = (date.today() - latest_log.date).days if latest_log else "a while"
            _send_push(
                sub,
                title="Time to train!",
                body=f"It has been {days_ago} days since your last workout. Get back on track!",
                url="/workout.html",
            )


@router.post("/check-inactivity")
def check_inactivity(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Manual trigger for inactivity check (admin/testing use)."""
    notify_inactivity_check(db)
    return {"status": "checked"}