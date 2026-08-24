import re

with open('backend/app/main.py', 'r') as f:
    content = f.read()

content = content.replace(
    'from .push_notifications import router as push_router, PushSubscription',
    'from .push_notifications import router as push_router'
)
content = content.replace(
    'db.query(PushSubscription)',
    'db.query(models.PushSubscription)'
)

with open('backend/app/main.py', 'w') as f:
    f.write(content)
