# API Reference

The IRONLOG backend exposes a RESTful API built with FastAPI. It handles routing, validation, authentication, and database interaction.

## Authentication System

IRONLOG uses strict `HttpOnly`, `Secure` cookies for session management to prevent XSS (Cross-Site Scripting) attacks from stealing authentication tokens. 

- **Login endpoint (`/auth/login`)**: Validates credentials and sets an `access_token` cookie.
- **Logout endpoint (`/auth/logout`)**: Clears the cookie.
- **Security Dependency (`get_current_user`)**: All protected endpoints depend on this function, which extracts the JWT from the cookie, decodes it, and queries the database for the user.

## Rate Limiting (SlowAPI)

To protect the application against brute-force attacks and spam, endpoints are rate-limited using `SlowAPI` (a FastAPI wrapper around limits).

- `/auth/login`: Limited to `5 requests / minute` per IP.
- `/auth/register`: Limited to `3 requests / minute` per IP.

If a limit is exceeded, the server returns a `429 Too Many Requests` response.

## Core Endpoints

*(Note: All endpoints below, except `/auth/*`, require authentication via the HttpOnly cookie).*

### Users & Auth
- `POST /auth/register` - Create a new user.
- `POST /auth/login` - Authenticate and set cookie.
- `POST /auth/logout` - Clear authentication cookie.
- `GET /profile/me` - Retrieve current user profile.
- `PUT /profile/me` - Update profile settings (e.g., `sidebar_collapsed`, `theme`).

### Workouts & Templates
- `GET /templates` - Get all saved templates for the user.
- `POST /templates` - Create a new template.
- `POST /templates/{id}/exercises` - Add an exercise to a template.
- `POST /templates/history` - Save a completed active workout session.
- `GET /templates/history` - Get user's past workout logs.

### Analytics & Tracking
- `GET /analytics/dashboard` - Get high-level stats (workouts this week, volume lifted).
- `GET /weight` - Get body weight logs.
- `POST /weight` - Log current body weight.
- `GET /nutrition` - Get daily calorie logs.
- `POST /nutrition` - Log macros (Calories, Protein, Carbs, Fats).

### AI Coach
- `GET /coach/advice` - Get generalized AI advice based on recent logs.
- `POST /coach/chat` - Interactive chat with the AI contextually aware of the user's data.

## Standard Error Handling
The API is designed to return consistent, parseable JSON errors rather than raw stack traces.

```json
{
  "detail": "Descriptive error message here."
}
```
The frontend `apiRequest` wrapper automatically intercepts these and displays user-friendly toast notifications.
