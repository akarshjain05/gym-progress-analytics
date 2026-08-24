import re

with open('backend/app/routers/analytics.py', 'r') as f:
    content = f.read()

# Fix _logging_streak
content = content.replace(
    'def _logging_streak(active_days: set[date_type]) -> dict:',
    'def _logging_streak(active_days: set[date_type], timezone_str: str) -> dict:'
)
content = content.replace(
    'today = get_today(current_user.timezone)',
    'today = get_today(timezone_str)'
)
content = content.replace(
    '_logging_streak(active_days)',
    '_logging_streak(active_days, current_user.timezone)'
)

with open('backend/app/routers/analytics.py', 'w') as f:
    f.write(content)

with open('backend/app/routers/coach.py', 'r') as f:
    coach_content = f.read()

# Fix coach.py functions if any
coach_content = coach_content.replace(
    'today = get_today(current_user.timezone)',
    'today = get_today("UTC")' # Wait, coach.py might not have current_user everywhere. Let's inspect it properly.
)

with open('backend/app/routers/coach.py', 'w') as f:
    f.write(coach_content)

