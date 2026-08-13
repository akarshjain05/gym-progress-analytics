# System Architecture

IRONLOG is designed as a decoupled client-server architecture, maximizing performance, reliability, and offline capabilities.

## High-Level Architecture

```mermaid
graph TD
    Client[Frontend (Vanilla JS PWA)]
    SW[Service Worker]
    IDB[(IndexedDB / Offline Queue)]
    API[FastAPI Backend]
    DB[(SQLite / PostgreSQL Database)]
    AI[Google Gemini API]

    Client <-->|Interacts| SW
    Client <-->|Caches requests| IDB
    SW <-->|Fetches/Syncs| API
    API <-->|Reads/Writes| DB
    API <-->|Generates insights| AI
```

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Security**: Passlib (Bcrypt), JWT (HttpOnly Cookies), SlowAPI (Rate Limiting)
- **Testing**: Pytest

### Frontend
- **Architecture**: Zero-build Vanilla JavaScript (No React/Vue/Angular)
- **Styling**: Vanilla CSS with CSS Variables for theming (Light/Dark mode)
- **PWA**: Standard Service Worker (`sw.js`) and Web App Manifest
- **Offline Storage**: IndexedDB (using `idb` wrapper logic)
- **Charts**: Chart.js
- **Security**: DOMPurify (XSS prevention)

## Core Design Principles

1. **Offline-First Resilience**: The frontend is a Progressive Web App (PWA) that intercepts network requests. If the user is offline, read requests are served from cache, and write requests (POST/PUT/DELETE) are queued in IndexedDB to be synced automatically upon reconnection.
2. **Zero-Build Frontend**: The frontend avoids complex toolchains (Webpack, Vite, Babel). It uses modern ES6+ JavaScript natively in the browser, ensuring rapid development and instant hot-reloading.
3. **Database-Level Integrity**: Data validity is not just checked at the API boundary but enforced deeply within the database using `CheckConstraint` and strict foreign key `CASCADE` rules.
4. **Secure by Default**: Authentication uses `HttpOnly`, `Secure`, and `SameSite=Lax` cookies to prevent XSS-based token theft. Rate limiting protects endpoints against brute-force attacks.

## Directory Structure
```text
gym-progress-analytics/
├── backend/
│   ├── alembic/            # Database migration scripts
│   ├── tests/              # Pytest suites
│   ├── auth.py             # JWT generation and security
│   ├── coach.py            # AI integration (Gemini)
│   ├── database.py         # SQLAlchemy engine setup
│   ├── main.py             # FastAPI entry point
│   ├── models.py           # Database schemas
│   └── routers/            # API endpoint controllers
├── frontend/
│   ├── css/                # Stylesheets (style.css, polish.css)
│   ├── js/                 # View controllers and utilities (api.js, sw.js)
│   ├── index.html          # Landing page
│   ├── app.html            # Core app pages...
│   └── manifest.json       # PWA manifest
└── docs/                   # Documentation
```
