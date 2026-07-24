# Ironlog (Gym Progress Analytics) Design Document

This document outlines the architecture, data models, and technical design for the Ironlog web application. It is intended to serve as a high-level reference for understanding how the application is stitched together.

## 1. High-Level Architecture

Ironlog is a monolithic web application structured into a clear separation between a static frontend and a RESTful backend API. 

*   **Frontend:** Pure Vanilla HTML/CSS/JavaScript. It operates as a Progressive Web App (PWA) with offline-support mechanisms and service workers.
*   **Backend:** Python with FastAPI. Handles authentication, data persistence, analytics calculations, and AI-driven forecasting.
*   **Database:** SQLite using SQLAlchemy as the ORM and Alembic for schema migrations.
*   **Deployment:** Designed to run via Docker Compose, utilizing standard CI/CD pipelines (e.g., GitHub Actions).

## 2. Frontend Design

The frontend is intentionally lightweight, avoiding heavy frameworks like React or Vue in favor of raw performance and direct DOM manipulation.

### Core Principles
*   **Vanilla Stack:** Built with raw JS/HTML.
*   **PWA First:** Uses `sw.js` and `manifest.json` for installation on mobile devices and offline data synchronization.
*   **Modular JS:** Logic is split by page domain (e.g., `dashboard.js`, `lifts.js`, `nutrition.js`).
*   **Centralized API Client:** `api.js` wraps all `fetch` calls, handling authentication tokens, error states, and offline queueing.
*   **UI System:** Relies on a unified CSS structure (`frontend/css/`) utilizing flexbox, CSS variables for theming (Light/Dark mode support), and standard modal overlays.

### Routing & Shell
Navigation is handled via multi-page routing (separate HTML files like `dashboard.html`, `lifts.html`). 
The `layout.js` file dynamically injects the sidebar and top navigation shell into each page to ensure UI consistency without duplicating HTML.

## 3. Backend Architecture (FastAPI)

The backend is modularized via FastAPI Routers to keep the codebase clean.

### Directory Structure (`backend/app/`)
*   `main.py`: Application entry point, CORS configuration, and route registration.
*   `database.py`: SQLAlchemy setup and session management.
*   `models.py`: Database schema definitions.
*   `routers/`: Domain-specific API endpoints.
    *   `auth.py`: JWT/Session authentication.
    *   `lifts.py`, `weight.py`, `nutrition.py`, `measurements.py`: CRUD operations for core logging.
    *   `coach.py`: Contains the complex predictive mathematical logic for the "AI Coach" (ETA calculations, trendlines).
    *   `analytics.py`: Aggregation queries for dashboard charts.

### Authentication
The application uses secure HTTP-only cookies/sessions for authentication to protect user data. 

## 4. Data Model (Schema)

The database schema is highly relational, centered around the `User`.

*   **User:** Core identity entity.
*   **LiftLog:** Records of individual sets (exercise name, weight, reps, RPE, date).
*   **WorkoutTemplate:** Saved routines for quick logging.
*   **BodyWeightLog:** Daily scale weigh-ins and body fat %.
*   **MeasurementLog:** Tape measurements for specific body parts (chest, waist, etc.).
*   **CalorieLog:** Nutrition tracking (calories, macros).
*   **Goal:** User-defined targets across different domains (strength, weight, frequency).

## 5. Key Design Decisions

1.  **"Sessions Away" Forecasting:** The predictive AI Coach deliberately avoids calculating strict calendar dates for goals, opting instead for a "sessions away" metric. This accommodates users who take unplanned rest days without artificially breaking their trends.
2.  **No-Build Frontend:** The decision to avoid Webpack/Babel/NPM for the frontend means the code you see is exactly what the browser runs, making debugging trivial and deployments near-instant.
3.  **Local Development:** Uses an `empty.db` seed and SQLite so any developer can spin up the full stack in seconds without configuring Postgres or external services.

## 6. Integrations & Extensions
*   **Push Notifications:** Implemented via standard Web Push API.
*   **Sentry / Error Tracking:** Configured for backend fault monitoring.

---
*Generated for architectural review.*
