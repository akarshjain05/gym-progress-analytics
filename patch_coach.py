import re

with open('backend/app/routers/coach.py', 'r') as f:
    content = f.read()

content = content.replace('from app.time_utils import ist_today', 'from app.time_utils import get_today')
content = content.replace('ist_today()', 'get_today(current_user.timezone)')

with open('backend/app/routers/coach.py', 'w') as f:
    f.write(content)
