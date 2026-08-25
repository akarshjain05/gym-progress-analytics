import re

with open('docker-compose.yml', 'r') as f:
    content = f.read()

content = content.replace('    command: redis-server --save 60 1 --loglevel warning', '    command: redis-server --save 60 1 --loglevel warning --requirepass ${REDIS_PASSWORD}')
content = content.replace('    healthcheck:\n      test: ["CMD", "redis-cli", "ping"]', '    healthcheck:\n      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]')
content = content.replace('redis://redis:6379/0', 'redis://:${REDIS_PASSWORD}@redis:6379/0')
content = content.replace('redis://redis:6379/1', 'redis://:${REDIS_PASSWORD}@redis:6379/1')

with open('docker-compose.yml', 'w') as f:
    f.write(content)
