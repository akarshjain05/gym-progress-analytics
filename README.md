# IRONLOG — Gym Progress Analytics

A full-stack, multi-user fitness tracker: body weight, lifts, and calories in, real trend analysis out. Built with a robust backend and a blazing-fast vanilla frontend, deployed autonomously via CI/CD.

## Tech Stack & Infrastructure

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: Vanilla HTML, CSS, JavaScript (Zero build step, Chart.js for visualizations)
- **Infrastructure**: Hosted on AWS EC2, fully containerized with Docker & Docker Compose
- **Web Server**: Caddy (acts as a reverse proxy and automatically provisions SSL/TLS certificates via Let's Encrypt for secure HTTPS)
- **CI/CD**: GitHub Actions (Every push to the `main` branch triggers an automated deployment to the EC2 server, pulling the latest code and rebuilding containers seamlessly)

## Features & Analytics

Nothing here is decorative — every number on screen comes from a tested formula:

- **Estimated 1RM** — Epley formula (`weight × (1 + reps/30)`), the standard used by most lifting trackers for rep ranges up to ~10-12.
- **BMR / Formula TDEE** — Mifflin-St Jeor equation × activity multiplier.
- **True Maintenance Calories** — Back-calculated from *your own* logged calories and *your own* real weight change (using ~7700 kcal per kg of body mass). Needs at least 10 overlapping days of calorie + weight logs.
- **Weekly Weight Trend** — Linear regression over your last 28 days of weigh-ins, smoothing out daily fluctuations.
- **Strength Level** (Beginner → Elite) — Approximate, bodyweight-ratio-based classification for major lifts.
- **AI Coach** — Uses Gemini to analyze your recent logs, strength levels, and trends, providing actionable feedback tailored to your progress.

## Premium UI / UX

- **Collapsible Sidebar**: Fully responsive layout with a collapsible sidebar. The toggle state is persisted in the database, syncing your preference across devices.
- **Mobile First**: Shifts to a sleek bottom navigation bar on mobile devices.
- **Custom Duotone Icons**: Hand-crafted, premium SVG duotone icons (frosted-glass style) for a rich, top-tier SaaS aesthetic.
- **Dark Mode Palette**: The palette is pulled from IPF/IWF weight-plate colors (25kg=red, 20kg=blue, 15kg=yellow/gold, 10kg=green) on a warm graphite background — grounded in the lifter's actual world.

## Project Structure

```
gym-progress-analytics/
├── backend/                 FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── main.py          App entrypoint, CORS, router wiring
│   │   ├── models.py        SQLAlchemy models
│   │   ├── schemas.py       Pydantic request/response schemas
│   │   ├── calculations.py  All formulas - isolated & unit-tested
│   │   ├── security.py      JWT auth, password hashing
│   │   └── routers/         auth, profile, weight, exercises, lifts, etc.
│   ├── tests/               Pytest test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 Vanilla HTML/CSS/JS (no build step)
│   ├── index.html            Login / register
│   ├── dashboard.html        Overview, streak, insights
│   ├── css/                  Design system, themes, mobile breakpoints
│   └── js/                   API clients, layout management, Chart.js
├── docker-compose.yml        Local and production container orchestration
├── Caddyfile                 Reverse proxy & SSL configuration
└── .github/workflows/deploy.yml  Automated CI/CD deployment script
```

## Running Locally (Docker)

The absolute easiest way to run the entire stack locally is using Docker Compose:

```bash
docker compose up -d --build
```

- **Frontend**: Available at `http://localhost:8080`
- **Backend API Docs**: Available at `http://localhost:8000/docs`

## Manual Local Setup

If you prefer to run it without Docker:

**Backend**:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
python3 -m http.server 8080
```
Open `http://127.0.0.1:8080`.

## Automated Deployments (CI/CD)

This project features a fully automated deployment pipeline. When code is pushed to the `main` branch, a GitHub Action is triggered:
1. Logs into the EC2 instance via SSH.
2. Pulls the latest changes from `main`.
3. Runs `docker compose up -d --build` to seamlessly update the live application.
4. Caddy handles routing and maintains secure HTTPS connections automatically.
