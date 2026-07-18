import re

with open("files (1)/style.css", "r") as f:
    content = f.read()

# Extract from .badge-red up to the end of .percentile-empty a:hover
match = re.search(r'(\.badge-red \{.*\.percentile-empty a:hover \{ text-decoration: underline; \})', content, re.DOTALL)
if match:
    css_code = match.group(1)
    
    with open("frontend/css/style.css", "a") as f2:
        f2.write("\n\n" + css_code + "\n")
