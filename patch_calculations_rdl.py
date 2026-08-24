with open('backend/app/calculations.py', 'r') as f:
    content = f.read()

content = content.replace('    "romanian deadlift (rdl)":         "romanian_dl",\n', '')

with open('backend/app/calculations.py', 'w') as f:
    f.write(content)
