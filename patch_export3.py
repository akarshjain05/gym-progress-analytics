import re

with open('backend/app/export.py', 'r') as f:
    content = f.read()

def_sanitize = """def sanitize_csv_field(value) -> str:
    if value is None:
        return ""
    val_str = str(value)
    if val_str and val_str[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + val_str
    return val_str
"""

if 'def sanitize_csv_field' not in content:
    content = content.replace('@router.get("/csv")', def_sanitize + '\n@router.get("/csv")')

with open('backend/app/export.py', 'w') as f:
    f.write(content)
