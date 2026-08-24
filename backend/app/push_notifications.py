import logging
logger = logging.getLogger(__name__)

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
from .security import get_current_user, get_current_admin_user
from . import models

router = APIRouter(prefix="/push", tags=["push"])

# ---------------------------------------------------------------------------
# Model — store one subscription per user (last registered device wins)
# ---------------------------------------------------------------------------



# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: SubscriptionKeys



def _send_push(subscription: models.PushSubscription, title: str, body: str, url: str = "/workout.html") -> tuple[bool, str]:
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
        # Check if it's a WebPushException with a 410 or 404 response
        if getattr(e, "response", None) is not None:
            if e.response.status_code in [410, 404]:
                return False, "410_GONE"
        logger.info(f"[push] Failed to send to user {subscription.user_id}: {e}")
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
    existing = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id
    ).first()

    if existing:
        existing.endpoint = payload.endpoint
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        sub = models.PushSubscription(
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
    sub = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id
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
    sub = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No push subscription found. Enable notifications first.")

    ok, reason = _send_push(sub, "IRONLOG Test", "Push notifications are working!", "/dashboard.html")
    if not ok:
        if reason == "410_GONE":
            db.delete(sub)
            db.commit()
            raise HTTPException(status_code=410, detail="Push subscription expired. Please re-enable notifications.")
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




def notify_inactivity_check(db: Session):
    """
    Check all users. If they haven't logged a workout in 3+ days, send a reminder.
    Call this from a daily cron/scheduler endpoint.
    """
    from sqlalchemy import func
    
    three_days_ago = date.today() - timedelta(days=3)
    subs = db.query(models.PushSubscription).all()
    
    if not subs:
        return
        
    user_ids = list({sub.user_id for sub in subs})
    
    # Get max date per user_id in one query
    latest_logs = (
        db.query(models.LiftLog.user_id, func.max(models.LiftLog.date).label('max_date'))
        .filter(models.LiftLog.user_id.in_(user_ids))
        .group_by(models.LiftLog.user_id)
        .all()
    )
    
    last_log_dates = {row.user_id: row.max_date for row in latest_logs}
    
    subs_to_delete = []

    for sub in subs:
        last_date = last_log_dates.get(sub.user_id)
        if last_date is None or last_date <= three_days_ago:
            days_ago = (date.today() - last_date).days if last_date else "a while"
            ok, reason = _send_push(
                sub,
                title="Time to train!",
                body=f"It has been {days_ago} days since your last workout. Get back on track!",
                url="/workout.html",
            )
            if not ok and reason == "410_GONE":
                subs_to_delete.append(sub)
                
    if subs_to_delete:
        for s in subs_to_delete:
            db.delete(s)
        db.commit()


@router.post("/check-inactivity")
def check_inactivity(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    """Manual trigger for inactivity check (admin/testing use)."""
    notify_inactivity_check(db)
    return {"status": "checked"}