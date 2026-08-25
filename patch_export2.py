import re

with open('backend/app/export.py', 'r') as f:
    content = f.read()

# I will replace `writer.writerow(list(row.values()))` with `writer.writerow([sanitize_csv_field(v) for v in row.values()])`
# And `writer.writerow([k, v])` with `writer.writerow([sanitize_csv_field(k), sanitize_csv_field(v)])`

content = content.replace('writer.writerow(list(row.values()))', 'writer.writerow([sanitize_csv_field(v) for v in row.values()])')
content = content.replace('writer.writerow([k, v])', 'writer.writerow([sanitize_csv_field(k), sanitize_csv_field(v)])')

with open('backend/app/export.py', 'w') as f:
    f.write(content)
