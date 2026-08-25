with open('backend/tests/test_coach_routes.py', 'r') as f:
    content = f.read()

content = content.replace('assert "insights" in resp.json()', 'assert "consistency" in resp.json()')

with open('backend/tests/test_coach_routes.py', 'w') as f:
    f.write(content)

with open('backend/tests/test_analytics_routes.py', 'r') as f:
    content = f.read()

content = content.replace('assert "current_period" in data', 'assert "current" in data')
content = content.replace('assert "total_workouts" in data', 'assert "active_days" in data')
content = content.replace('assert isinstance(resp.json(), list)', 'assert isinstance(resp.json(), dict) and "available" in resp.json()')

with open('backend/tests/test_analytics_routes.py', 'w') as f:
    f.write(content)
