# IRONLOG — Gym Progress Analytics

A full-stack, multi-user fitness tracker: body weight, lifts, and calories in,
real trend analysis out. Same stack as your code judge project (FastAPI +
PostgreSQL on Render, static HTML/JS frontend on Netlify), so the deployment
flow should feel familiar.

## What it actually calculates

Nothing here is decorative — every number on screen comes from a tested
formula in `backend/app/calculations.py`:

- **Estimated 1RM** — Epley formula (`weight × (1 + reps/30)`), the standard
  used by most lifting trackers for rep ranges up to ~10-12.
- **BMR / formula TDEE** — Mifflin-St Jeor equation × activity multiplier.
  This is a population-average estimate from your profile.
- **Your actual maintenance calories** — back-calculated from *your own*
  logged calories and *your own* real weight change (using ~7700 kcal per kg
  of body mass). This is the more useful number once you have 2+ weeks of
  consistent logs, since it reflects your real metabolism instead of an
  average. Needs at least 10 overlapping days of calorie + weight logs to
  appear.
- **Weekly weight trend** — linear regression over your last 28 days of
  weigh-ins, not just "first point vs last point," so a single noisy day
  doesn't swing the number.
- **Goal ETA** — projected from that trend rate. Returns nothing if you don't
  have enough data, or if your trend is moving the wrong direction.
- **Strength level** (beginner → elite) — approximate, bodyweight-ratio-based
  classification for bench/squat/deadlift/OHP. Clearly labeled as a rough
  community heuristic, not a clinical standard.
- **Logging streak** — consecutive days with at least one entry (weight,
  lift, or calories).

All of this is unit-tested (`backend/tests/test_calculations.py`,
18 tests) and exercised end-to-end against a real database
(`backend/tests/test_integration.py`, 17 tests) — 35 tests total, all
passing.

## Project structure

```
gym-progress-analytics/
├── backend/                 FastAPI + SQLAlchemy + PostgreSQL/SQLite
│   ├── app/
│   │   ├── main.py          App entrypoint, CORS, router wiring
│   │   ├── models.py        SQLAlchemy models
│   │   ├── schemas.py       Pydantic request/response schemas
│   │   ├── calculations.py  All formulas - isolated & unit-tested
│   │   ├── security.py      JWT auth, password hashing
│   │   ├── seed_exercises.py  28 predefined exercises, seeded on startup
│   │   └── routers/         auth, profile, weight, exercises, lifts,
│   │                        nutrition, goals, analytics
│   ├── tests/                35 tests (pytest)
│   ├── requirements.txt
│   ├── render.yaml           One-click Render blueprint (web + Postgres)
│   └── .env.example
└── frontend/                 Vanilla HTML/CSS/JS (no build step)
    ├── index.html             Login / register
    ├── dashboard.html         Overview, streak, insights, goal progress
    ├── weight.html            Log weight, trend chart, goal projection
    ├── lifts.html             Log sets, 1RM chart, PRs, strength level
    ├── nutrition.html         Log calories, TDEE comparison chart
    ├── analytics.html         Cross-exercise comparison, volume, full insights
    ├── profile.html           Stats, units, lift goals
    ├── css/style.css          Design system (see below)
    └── js/
        ├── config.js          ← set your deployed backend URL here
        ├── api.js              API client + auth/token handling
        ├── layout.js            Shared sidebar shell
        ├── vendor/chart.umd.js  Chart.js, vendored locally (no CDN dependency)
        └── {page}.js            Per-page logic
```

## Design

Named **IRONLOG**. The palette is pulled from actual IPF/IWF weight-plate
colors (25kg=red, 20kg=blue, 15kg=yellow/gold, 10kg=green) on a warm graphite
background — grounded in the lifter's actual world rather than an arbitrary
dark+neon scheme. Display numbers use a condensed gym-signage face (Oswald),
body text is Inter, logged data uses a mono face. The signature visual motif
is a barbell-sleeve divider (line + end collars) and a "plate-loading" bar
for goal progress instead of a generic progress bar.

## Running locally

**Backend** (defaults to SQLite, zero setup):
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API docs at `http://127.0.0.1:8000/docs`.

**Frontend** — just needs a static file server (no build step):
```bash
cd frontend
python3 -m http.server 8080
```
Open `http://127.0.0.1:8080`. `js/config.js` already points at
`http://127.0.0.1:8000`, matching the default backend port above.

**Run the tests:**
```bash
cd backend
pip install -r requirements.txt pytest
pytest tests/ -v
```

## Deploying — everything on Render (backend + frontend + DB)

See the full step-by-step walkthrough in chat. Short version: `render.yaml`
at the repo root defines all three resources (API web service, static
frontend, Postgres DB) as one Blueprint — push to GitHub, then in Render:
New → Blueprint → connect the repo → Deploy Blueprint.

## Notes on what's NOT included (by design, per your call)

- **Progress photos** — left out for now since free hosting tiers don't give
  persistent disk storage. If you want this later, the cleanest path is a
  free-tier image host (e.g. Cloudinary) called from the frontend on upload,
  storing just the returned URL in a new `photo_url` column.
- **Admin dashboard** — not included since this is multi-user-but-personal
  (everyone only sees their own data); easy to add later following the same
  router pattern if you want usage visibility.

## Extending it later

Things you mentioned wanting to keep iterating on — the codebase is set up
to make these straightforward additions:
- Macro targets (protein/carb/fat goals, not just calories) — schema already
  stores them per entry, just needs target fields on the profile + a
  comparison view.
- Workout templates / programs (e.g. "push day" = a saved list of exercises)
  — would be a new `WorkoutTemplate` model referencing `Exercise`.
- CSV export — straightforward addition to each router given data's already
  queryable per user.
