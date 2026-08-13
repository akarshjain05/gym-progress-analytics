# IRONLOG Documentation

Welcome to the comprehensive documentation for **IRONLOG - Gym Progress Analytics**.

This directory contains all the necessary architectural, technical, and operational documentation required to understand, develop, and deploy the application in a production environment.

## Table of Contents

1. [System Architecture](file:///Users/a91732/Downloads/gym-progress-analytics/docs/architecture.md)
   - High-level overview, technology stack, and directory structure.
2. [Database Schema](file:///Users/a91732/Downloads/gym-progress-analytics/docs/database-schema.md)
   - Entity-relationship details, models, constraints, and cascades.
3. [API Reference](file:///Users/a91732/Downloads/gym-progress-analytics/docs/api-reference.md)
   - REST endpoints, authentication (HttpOnly cookies), and rate limiting.
4. [Frontend & PWA](file:///Users/a91732/Downloads/gym-progress-analytics/docs/frontend-pwa.md)
   - Vanilla JS architecture, Offline-first IndexedDB sync, and Service Workers.
5. [AI Coach Integration](file:///Users/a91732/Downloads/gym-progress-analytics/docs/ai-coach.md)
   - Gemini API integration, prompt engineering, and fallback strategies.
6. [Deployment & Operations](file:///Users/a91732/Downloads/gym-progress-analytics/docs/deployment.md)
   - Environment variables, production checklist, and hosting guidelines.

## Quick Start for Developers

1. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend Setup**:
   The frontend is a vanilla JS application and requires no build step. Simply serve the `frontend` directory using any local web server:
   ```bash
   npx serve frontend
   # or
   python -m http.server -d frontend 8000
   ```

3. **Database Migrations**:
   ```bash
   cd backend
   alembic upgrade head
   ```
