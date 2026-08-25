with open('backend/tests/test_coach_routes.py', 'r') as f:
    content = f.read()

content = content.replace('    assert resp.status_code == 200\n    assert "insights" in resp.json()', '    assert resp.status_code == 200, resp.text\n    assert "insights" in resp.json()')
content = content.replace('    assert resp.status_code == 200\n    assert "message" in resp.json()', '    assert resp.status_code == 200, resp.text\n    assert "Start logging" in resp.text')

with open('backend/tests/test_coach_routes.py', 'w') as f:
    f.write(content)
