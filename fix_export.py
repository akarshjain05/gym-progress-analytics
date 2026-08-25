with open('backend/app/export.py', 'r') as f:
    content = f.read()

content = content.replace("    if val_str and val_str[0] in ('=', '+', '-', '@', '\t', '\n'):", "    if val_str and val_str[0] in ('=', '+', '-', '@', '\\t', '\\r'):")
content = content.replace("    if val_str and val_str[0] in ('=', '+', '-', '@', '\t', ''):", "    if val_str and val_str[0] in ('=', '+', '-', '@', '\\t', '\\r'):")

with open('backend/app/export.py', 'w') as f:
    f.write(content)
