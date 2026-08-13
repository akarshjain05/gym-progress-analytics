# Database Schema

IRONLOG uses SQLAlchemy as its ORM, supporting both SQLite (for local development) and PostgreSQL (for production).

## Core Philosophy

1. **Database-Level Integrity**: Validation does not stop at the API layer (Pydantic). The schema heavily utilizes `CheckConstraint` to prevent physically impossible data from entering the database, regardless of how it was submitted.
2. **Cascading Deletes**: Foreign Keys are strictly configured with `ondelete="CASCADE"`. This ensures no orphaned rows are left behind if a parent entity (like a User or a Workout Template) is deleted.

## Key Models

### `User`
The central entity. All other logs and templates belong to a user.
- `id`, `username`, `email`, `hashed_password`, `role`.

### `Exercise`
A global dictionary of exercises available to all users.
- `id`, `name`, `muscle_group`, `category`.
- *Note:* The `muscle_group` is enforced via frontend rules to adhere to a strict list (e.g., `chest`, `back`, `shoulders`, etc.).

### `WorkoutTemplate` & `WorkoutTemplateExercise`
Defines a user's pre-planned workouts.
- A `WorkoutTemplate` has many `WorkoutTemplateExercise`s.
- `WorkoutTemplateExercise` enforces `target_sets > 0` and `target_reps > 0` via Check Constraints.
- `cascade="all, delete-orphan"` (ORM layer) and `ondelete="CASCADE"` (DB layer) ensure total cleanup upon deletion.

### `WorkoutSession` & `LiftLog`
Records of actually completed workouts.
- `WorkoutSession` records the start time, end time, and optional notes.
- `LiftLog` records individual sets (weight, reps, RPE).
- **Check Constraints**: `weight_kg >= 0`, `reps > 0`, `rpe` between 0 and 10.

### Metrics Logging
- **`BodyWeightLog`**: `weight_kg > 0`, `body_fat_pct` (0-100).
- **`CalorieLog`**: `calories >= 0`, macros >= 0.
- **`BodyMeasurement`**: Enforces all measurement fields (chest, waist, etc.) are `> 0`.

## Alembic Migrations

The project uses Alembic to manage schema changes over time.

- **To generate a new migration after modifying `models.py`:**
  ```bash
  alembic revision --autogenerate -m "Description of change"
  ```
- **To apply migrations:**
  ```bash
  alembic upgrade head
  ```
- *Note for SQLite:* Alembic is configured with `render_as_batch=True` in `env.py` to support `ALTER TABLE` operations, which native SQLite handles poorly.
