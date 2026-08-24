import os
import re

files_to_patch = [
    'backend/app/main.py',
    'backend/app/email_utils.py',
    'backend/app/push_notifications.py',
    'backend/app/worker.py'
]

for filepath in files_to_patch:
    with open(filepath, 'r') as f:
        content = f.read()

    # Add logger import if missing
    if 'import logging' not in content:
        content = "import logging\nlogger = logging.getLogger(__name__)\n\n" + content
    elif 'logger = ' not in content:
        content = content.replace('import logging', 'import logging\nlogger = logging.getLogger(__name__)')

    # Replace print(...) with logger.info/error
    # simple replacements
    content = re.sub(r'print\(\s*f?"\[ERROR\] (.*?)"\s*\)', r'logger.error(f"\1")', content)
    content = re.sub(r'print\(\s*f?"\[DEV.*?\] (.*?)"\s*\)', r'logger.info(f"[DEV] \1")', content)
    content = re.sub(r'print\(\s*f?"Warning: (.*?)"\s*\)', r'logger.warning(f"\1")', content)
    content = re.sub(r'print\(\s*f?"(.*?)"\s*\)', r'logger.info(f"\1")', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
