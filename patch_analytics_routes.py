import re

with open('backend/app/routers/analytics.py', 'r') as f:
    content = f.read()

# Fix in wrapped
content = content.replace(
    '    today = get_today(timezone_str)\n    target_year = year or today.year',
    '    timezone_str = current_user.timezone or "UTC"\n    today = get_today(timezone_str)\n    target_year = year or today.year'
)

# Fix in compare
content = content.replace(
    '    today = get_today(timezone_str)\n    current_end = today',
    '    timezone_str = current_user.timezone or "UTC"\n    today = get_today(timezone_str)\n    current_end = today'
)

with open('backend/app/routers/analytics.py', 'w') as f:
    f.write(content)
