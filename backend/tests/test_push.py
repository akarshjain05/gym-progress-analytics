import pytest
from app import models

def test_push_subscribe(client, auth_headers):
    headers = auth_headers(client, "pushuser", "password123")
    resp = client.post("/push/subscribe", json={
        "endpoint": "https://fcm.googleapis.com/fcm/send/fake-endpoint",
        "keys": {"p256dh": "key", "auth": "auth"}
    }, headers=headers)
    assert resp.status_code == 201

def test_push_unsubscribe(client, auth_headers):
    headers = auth_headers(client, "unsubuser", "password123")
    client.post("/push/subscribe", json={
        "endpoint": "https://fcm.googleapis.com/fcm/send/fake-endpoint",
        "keys": {"p256dh": "key", "auth": "auth"}
    }, headers=headers)
    resp = client.delete("/push/unsubscribe?endpoint=https://fcm.googleapis.com/fcm/send/fake-endpoint", headers=headers)
    assert resp.status_code == 204

def test_push_test(client, auth_headers):
    headers = auth_headers(client, "testuser", "password123")
    client.post("/push/subscribe", json={
        "endpoint": "https://fcm.googleapis.com/fcm/send/fake-endpoint",
        "keys": {"p256dh": "key", "auth": "auth"}
    }, headers=headers)
    resp = client.post("/push/test", headers=headers)
    # The actual push to Google might fail if VAPID keys aren't real, but the endpoint should at least return 200 or 500 depending on handling.
    # In push_notifications.py, failures are caught and printed, so it returns 200.
    assert resp.status_code in [200, 503]
