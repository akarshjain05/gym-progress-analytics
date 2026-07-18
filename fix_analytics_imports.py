import re

with open('backend/app/routers/analytics.py', 'r') as f:
    content = f.read()

# Fix 1: Add imports for func, extract, and Optional
if "from typing import Optional" not in content:
    content = content.replace("from fastapi import APIRouter, Depends", "from typing import Optional\nfrom fastapi import APIRouter, Depends")
if "from sqlalchemy import func" not in content:
    content = content.replace("from sqlalchemy.orm import Session", "from sqlalchemy.orm import Session\nfrom sqlalchemy import func, extract")

# Fix 2: Replace `int = None` with `Optional[int] = None`
content = content.replace("year: int = None", "year: Optional[int] = None")
content = content.replace("month: int = None", "month: Optional[int] = None")

# Fix 3: Replace `db.func.extract` with `extract`
content = content.replace("db.func.extract", "extract")

with open('backend/app/routers/analytics.py', 'w') as f:
    f.write(content)

