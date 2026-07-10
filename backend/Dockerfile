FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# We add celery and redis to the requirements if they aren't there
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir celery redis

COPY . .

# Celery runs as a different command, default command will be overridden by docker-compose
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
