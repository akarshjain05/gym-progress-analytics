import re

with open('backend/app/export.py', 'r') as f:
    content = f.read()

def_sanitize = """def sanitize_csv_field(value: str) -> str:
    if not value:
        return value
    val_str = str(value)
    if val_str and val_str[0] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + val_str
    return val_str
"""

# Insert sanitize_csv_field before export_csv
content = content.replace('@router.get("/csv")', def_sanitize + '\n@router.get("/csv")')

# Apply to writerow
# In _get_all_user_data, it's just getting data.
# In export_csv, it writes data.
