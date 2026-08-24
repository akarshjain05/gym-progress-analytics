import re

with open('backend/tests/test_coach_eta.py', 'r') as f:
    content = f.read()

content = content.replace('from app.routers.coach import _eta_for_exercise, ist_today', 'from app.routers.coach import _eta_for_exercise\nfrom app.time_utils import get_today')
content = content.replace('ist_today()', 'get_today("UTC")')

with open('backend/tests/test_coach_eta.py', 'w') as f:
    f.write(content)
