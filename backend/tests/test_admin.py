import pytest

def test_admin_endpoints_unauthorized(client, auth_headers):
    # Standard user
    headers = auth_headers(client, "normie", "password123", is_admin=False)
    
    assert client.get("/admin/users", headers=headers).status_code == 403
    assert client.get("/admin/stats", headers=headers).status_code == 403
    assert client.get("/admin/logs", headers=headers).status_code == 403
    assert client.post("/admin/promote/1", headers=headers).status_code == 403
    assert client.delete("/admin/users/1", headers=headers).status_code == 403

def test_admin_get_users(client, auth_headers):
    headers = auth_headers(client, "adminuser", "password123", is_admin=True)
    resp = client.get("/admin/users", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

def test_admin_promote_user(client, auth_headers):
    admin_headers = auth_headers(client, "admin2", "password123", is_admin=True)
    # Create normal user
    resp = client.post("/auth/register", json={"username": "tobepromoted", "email": "p@example.com", "password": "password123"})
    assert resp.status_code == 201, resp.text
    
    # Get user id
    users = client.get("/admin/users", headers=admin_headers).json()
    target = next((u for u in users if u["username"] == "tobepromoted"), None)
    assert target is not None
    
    resp = client.post(f"/admin/promote/{target['id']}", headers=admin_headers)
    assert resp.status_code == 200
    
    # Check promotion
    users = client.get("/admin/users", headers=admin_headers).json()
    updated = next(u for u in users if u["id"] == target["id"])
    assert updated["role"] == "admin"

def test_admin_delete_user(client, auth_headers):
    admin_headers = auth_headers(client, "admin3", "password123", is_admin=True)
    resp = client.post("/auth/register", json={"username": "tobedeleted", "email": "d@example.com", "password": "password123"})
    assert resp.status_code == 201, resp.text
    
    users = client.get("/admin/users", headers=admin_headers).json()
    target = next(u for u in users if u["username"] == "tobedeleted")
    
    resp = client.delete(f"/admin/users/{target['id']}", headers=admin_headers)
    assert resp.status_code == 200
    
    users = client.get("/admin/users", headers=admin_headers).json()
    assert not any(u["id"] == target["id"] for u in users)

def test_admin_delete_self(client, auth_headers):
    admin_headers = auth_headers(client, "admin4", "password123", is_admin=True)
    users = client.get("/admin/users", headers=admin_headers).json()
    admin_user = next(u for u in users if u["username"] == "admin4")
    
    resp = client.delete(f"/admin/users/{admin_user['id']}", headers=admin_headers)
    assert resp.status_code == 400

def test_admin_stats_and_logs(client, auth_headers):
    admin_headers = auth_headers(client, "admin5", "password123", is_admin=True)
    
    resp = client.get("/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert "total_users" in stats
    
    resp = client.get("/admin/logs", headers=admin_headers)
    assert resp.status_code == 200
    logs = resp.json()
    assert isinstance(logs, list)
