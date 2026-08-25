import re

with open('backend/app/main.py', 'r') as f:
    content = f.read()

# I will find the block:
#            if settings.initial_admin_username:
#                try:
#                    db.execute(
#                        text("UPDATE users SET role = 'admin' WHERE username = :u AND role != 'admin'"),
#                        {"u": settings.initial_admin_username}
#                    )
#                    db.commit()
#                except Exception as e:
#                    logger.info(f"Failed to set initial admin: {e}")
# And remove it.

lines = content.split('\n')
new_lines = []
skip = False
for line in lines:
    if 'if settings.initial_admin_username:' in line:
        skip = True
    elif skip and 'logger.info(f"Failed to set initial admin:' in line:
        skip = False
        continue
    elif not skip:
        new_lines.append(line)

with open('backend/app/main.py', 'w') as f:
    f.write('\n'.join(new_lines))
