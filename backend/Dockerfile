FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Dependencies are pinned in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Celery runs as a different command, default command will be overridden by docker-compose
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
