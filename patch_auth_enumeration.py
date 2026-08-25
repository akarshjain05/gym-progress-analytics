import re

with open('backend/app/routers/auth.py', 'r') as f:
    content = f.read()

# Replace lockout error
content = content.replace(
    'detail=f"Account is locked due to too many failed attempts. Try again in {minutes_left} minutes.",',
    'detail="Invalid credentials. If this account exists, it may be temporarily locked.",'
)

# Replace invalid creds error
content = content.replace(
    'detail="Incorrect username or password",',
    'detail="Invalid credentials. If this account exists, it may be temporarily locked.",'
)

with open('backend/app/routers/auth.py', 'w') as f:
    f.write(content)

with open('backend/tests/test_auth_flows.py', 'r') as f:
    test_content = f.read()

test_content = test_content.replace(
    'assert "Account is locked" in resp.json()["detail"]',
    'assert "temporarily locked" in resp.json()["detail"]'
)

with open('backend/tests/test_auth_flows.py', 'w') as f:
    f.write(test_content)
