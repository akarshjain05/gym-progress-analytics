# Deployment & Operations

This document outlines how to take IRONLOG from a local development environment to a live production server.

## 1. Environment Variables

Create a `.env` file in the `backend/` directory. For production, you must configure the following:

```env
# Essential
SECRET_KEY=your_super_long_random_secret_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200  # e.g., 30 days

# AI Integration
GEMINI_API_KEY=your_google_gemini_api_key

# Database
# If left blank, it defaults to sqlite:///./gym.db
# For production, use PostgreSQL:
DATABASE_URL=postgresql://user:password@localhost/dbname
```
*To generate a secure `SECRET_KEY`, you can run `openssl rand -hex 32` in your terminal.*

## 2. Database Preparation

For production, SQLite is not recommended due to concurrency limits. 

1. Setup a PostgreSQL database.
2. Update `DATABASE_URL` in `.env`.
3. Apply the migrations:
   ```bash
   cd backend
   alembic upgrade head
   ```

## 3. Backend Deployment

The backend is a standard FastAPI application. It should be run using `Uvicorn` and managed by a process manager like `Gunicorn` or `systemd`.

**Start Command (via Gunicorn with Uvicorn workers):**
```bash
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Security Considerations for Backend
- Ensure your reverse proxy (e.g., Nginx) terminates SSL/TLS. The backend relies on `Secure` cookies, which will only be sent over HTTPS.
- Rate limiting is active by default via `SlowAPI`. Ensure your reverse proxy forwards the correct client IP via `X-Forwarded-For`.

## 4. Frontend Deployment

The frontend is just static HTML/CSS/JS files. It requires no build step (`npm run build` is not needed).

You can serve the `frontend/` directory using any static file hosting service:
- Nginx / Apache
- AWS S3 + CloudFront
- Cloudflare Pages
- Vercel / Netlify

### Connecting Frontend to Backend
By default, the frontend (`api.js`) expects the backend to be at `/api`. In production, you must use a Reverse Proxy to route requests correctly:

**Example Nginx Configuration:**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    # Serve static frontend files
    location / {
        root /path/to/ironlog/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. PWA Checklist

For the Progressive Web App to install correctly on users' devices:
1. The site **must** be served over HTTPS.
2. The `manifest.json` must be accessible.
3. The Service Worker (`sw.js`) must be served from the root (or have the appropriate scope).
4. Verify the `icons/` directory is fully populated with the required sizes (192x192, 512x512).
