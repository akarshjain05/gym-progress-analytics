import pytest
from unittest.mock import patch
from app.routers import auth

def test_auth_forgot_and_reset_password(client):
    # Register user
    client.post("/auth/register", json={"username": "resetuser", "email": "reset@example.com", "password": "password123"})
    
    with patch("app.routers.auth.send_password_reset_email") as mock_send, \
         patch("app.routers.auth.settings.demo_mode", True):
        # Request forgot password
        resp = client.post("/auth/forgot-password", json={"email": "reset@example.com"})
        assert resp.status_code == 200
        
        # It's demo mode, so the token should be in the response
        data = resp.json()
        assert "reset_link" in data
        token = data["reset_link"].split("=")[-1]
        
        assert token is not None
        
        # Reset password
        resp = client.post("/auth/reset-password", json={"token": token, "new_password": "newpassword123"})
        assert resp.status_code == 200
        
        # Verify login works with new password
        from app.models import User
        db = client.TestingSessionLocal()
        user = db.query(User).filter(User.email == "reset@example.com").first()
        user.email_verified = True
        db.commit()
        db.close()
        
        resp = client.post("/auth/login", data={"username": "resetuser", "password": "newpassword123"})
        assert resp.status_code == 200

def test_google_auth(client):
    with patch("app.routers.auth.verify_google_id_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google123456",
            "email": "google@example.com",
            "name": "Google User",
            "email_verified": True
        }
        
        resp = client.post("/auth/google", json={"id_token": "fake_token"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data or "needs_setup" in data

def test_email_verification(client):
    with patch("app.routers.auth.send_verification_email") as mock_send:
        resp = client.post("/auth/register", json={"username": "verifyuser", "email": "verify@example.com", "password": "password123"})
        assert resp.status_code == 201
        
        # The link should have been passed to send_verification_email
        verify_link = mock_send.call_args[0][1]
        token = verify_link.split("=")[-1]
        
        resp = client.post("/auth/verify-email", json={"token": token})
        assert resp.status_code == 200
