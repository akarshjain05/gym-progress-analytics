import requests

from .config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Sends a password reset email via Brevo's transactional email HTTP API.
    Uses HTTPS (port 443), NOT SMTP - Render's free tier (and many cloud
    platforms) silently blocks or hangs outbound SMTP connections as an
    anti-spam measure, which has no clean error and just looks like the
    request hanging forever. Brevo's REST API avoids that entirely.

    If BREVO_API_KEY isn't configured, this prints the reset link to the
    server logs instead of sending an email, so local development and
    automated tests never need a real API key.

    If the Brevo API call itself fails (bad key, rate limit, etc.), this
    logs the error but does NOT raise - the /auth/forgot-password endpoint
    is designed to always return the same generic response regardless of
    whether the email actually exists or sending succeeded, so a transient
    email-provider failure shouldn't turn into a 500 for the user.
    """
    if not settings.brevo_api_key:
        print(f"[DEV - no BREVO_API_KEY configured] Password reset link for {to_email}: {reset_link}")
        return

    text_body = (
        "Reset your IRONLOG password using the link below. It's valid for 1 hour.\n\n"
        f"{reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
    html_body = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #222;">
      <h2 style="color:#E2402D;">Reset your IRONLOG password</h2>
      <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="{reset_link}" style="display:inline-block;background:#E2402D;color:#ffffff;
           padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p style="color:#888;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    payload = {
        "sender": {"email": settings.brevo_sender_email, "name": "IRONLOG"},
        "to": [{"email": to_email}],
        "subject": "Reset your IRONLOG password",
        "htmlContent": html_body,
        "textContent": text_body,
    }
    headers = {
        "accept": "application/json",
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
    }

    try:
        resp = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[ERROR] Failed to send password reset email via Brevo: {e}")


def send_verification_email(to_email: str, verify_link: str) -> None:
    """
    Sends an email verification link via Brevo's transactional email HTTP API.
    """
    if not settings.brevo_api_key:
        print(f"[DEV - no BREVO_API_KEY configured] Email verification link for {to_email}: {verify_link}")
        return

    text_body = (
        "Welcome to IRONLOG! Please verify your email address using the link below. It's valid for 24 hours.\n\n"
        f"{verify_link}\n\n"
        "If you didn't create this account, you can safely ignore this email."
    )
    html_body = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #222;">
      <h2 style="color:#2196F3;">Verify your email address</h2>
      <p>Click the button below to verify your email and activate your IRONLOG account. This link is valid for <strong>24 hours</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="{verify_link}" style="display:inline-block;background:#2196F3;color:#ffffff;
           padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
      </p>
      <p style="color:#888;font-size:13px;">If you didn't create this account, you can safely ignore this email.</p>
    </div>
    """

    payload = {
        "sender": {"email": settings.brevo_sender_email, "name": "IRONLOG"},
        "to": [{"email": to_email}],
        "subject": "Verify your IRONLOG email address",
        "htmlContent": html_body,
        "textContent": text_body,
    }
    headers = {
        "accept": "application/json",
        "api-key": settings.brevo_api_key,
        "content-type": "application/json",
    }

    try:
        resp = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"[ERROR] Failed to send verification email via Brevo: {e}")