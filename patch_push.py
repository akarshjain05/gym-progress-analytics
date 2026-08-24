import re

with open('backend/app/push_notifications.py', 'r') as f:
    content = f.read()

# Extract the class
pattern = re.compile(r'class PushSubscription\(Base\):.*?    user = relationship\("User"\)\n', re.DOTALL)
class_def = pattern.search(content).group(0)

# Remove the class from push_notifications.py
content = content.replace(class_def, '')

# Use models.PushSubscription everywhere in push_notifications.py
# First replace the occurrences of type hint PushSubscription with models.PushSubscription
content = re.sub(r'(?<!models\.)PushSubscription(?!In|Out|Keys)', 'models.PushSubscription', content)

with open('backend/app/push_notifications.py', 'w') as f:
    f.write(content)

with open('backend/app/models.py', 'r') as f:
    models_content = f.read()

models_content += '\n\n' + class_def

with open('backend/app/models.py', 'w') as f:
    f.write(models_content)
