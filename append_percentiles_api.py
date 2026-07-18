import re

# Read the endpoint from the provided analytics_router.py
with open("files (1)/analytics_router.py", "r") as f:
    content = f.read()
    
# Extract the endpoint
match = re.search(r'(@router\.get\("/strength-percentiles"\).*?)(?=@router\.get)', content, re.DOTALL)
if match:
    endpoint_code = match.group(1)
    
    # Append to backend/app/routers/analytics.py
    with open("backend/app/routers/analytics.py", "a") as f2:
        f2.write("\n" + endpoint_code)
