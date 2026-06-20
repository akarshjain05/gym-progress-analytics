import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .config import settings


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """
    Sends a password reset email via SMTP (STARTTLS on smtp_port, 587 by
    default - the standard port/method for Gmail and most providers).

    If SMTP isn't configured (no SMTP_HOST env var set), this prints the
    reset link to the server logs instead of sending an email, so local
    development and automated tests never need real email credentials.
    """
    if not settings.smtp_host:
        print(f"[DEV - no SMTP configured] Password reset link for {to_email}: {reset_link}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your IRONLOG password"
    msg["From"] = settings.smtp_from_email or settings.smtp_user
    msg["To"] = to_email

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

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(msg["From"], [to_email], msg.as_string())