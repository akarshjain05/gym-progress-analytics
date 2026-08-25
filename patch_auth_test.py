import re

with open('backend/tests/test_auth_flows.py', 'r') as f:
    content = f.read()

content = content.replace('app.state.limiter.enabled = True', 'app.state.limiter.enabled = True\n    from app.routers.auth import limiter\n    limiter.enabled = True')
content = content.replace('app.state.limiter.enabled = False', 'app.state.limiter.enabled = False\n    limiter.enabled = False')

with open('backend/tests/test_auth_flows.py', 'w') as f:
    f.write(content)
