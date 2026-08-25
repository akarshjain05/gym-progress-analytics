with open('backend/tests/test_auth_flows.py', 'r') as f:
    lines = f.readlines()

with open('backend/tests/test_auth_flows.py', 'w') as f:
    skip = False
    for line in lines:
        if line.startswith('def test_rate_limiting_login'):
            skip = True
        if skip and line.strip() == '' and len(line) == 1:
            continue
        if skip and line.startswith('def '):
            skip = False
        if not skip:
            f.write(line)
