from datetime import datetime, date, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean,
    UniqueConstraint, Text, JSON, CheckConstraint
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    failed_login_attempts = Column(Integer, default=0, nullable=False, server_default='0')
    locked_until = Column(DateTime, nullable=True)

    google_id = Column(String, unique=True, index=True, nullable=True)

    role = Column(String, default="user", nullable=False, server_default='user')

    email_verified = Column(Boolean, default=False, nullable=False, server_default='false')
    email_verification_token = Column(String, nullable=True)
    email_verification_expires = Column(DateTime, nullable=True)

    reset_token_hash = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True, default="moderate")
    unit_preference = Column(String, nullable=False, default="kg")

    goal_weight_kg = Column(Float, nullable=True)
    sidebar_collapsed = Column(Boolean, default=False, nullable=False, server_default='false')
    onboarding_completed = Column(Boolean, default=False, nullable=False, server_default='false')

    weight_logs = relationship("BodyWeightLog", back_populates="user", cascade="all, delete-orphan")
    lift_logs = relationship("LiftLog", back_populates="user", cascade="all, delete-orphan")
    calorie_logs = relationship("CalorieLog", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    workout_templates = relationship("WorkoutTemplate", back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    measurements = relationship("BodyMeasurement", back_populates="user", cascade="all, delete-orphan")

    @property
    def has_google_login(self) -> bool:
        return self.google_id is not None

    @property
    def has_password(self) -> bool:
        return self.password_hash is not None


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)
    muscle_group = Column(String, nullable=True)
    secondary_muscle = Column(String, nullable=True)
    equipment = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    instructions = Column(String, nullable=True)
    is_custom = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (UniqueConstraint("name", "created_by", name="uq_exercise_name_per_owner"),)


class BodyWeightLog(Base):
    __tablename__ = "body_weight_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    weight_kg = Column(Float, nullable=False)
    body_fat_pct = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="weight_logs")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_weight_per_user_per_day"),
        CheckConstraint("weight_kg > 0", name="chk_bodyweight_positive"),
        CheckConstraint("body_fat_pct >= 0 AND body_fat_pct <= 100", name="chk_bodyfat_range"),
    )


class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    chest = Column(Float, nullable=True)
    waist = Column(Float, nullable=True)
    neck = Column(Float, nullable=True)
    hip = Column(Float, nullable=True)
    arm = Column(Float, nullable=True)
    forearm = Column(Float, nullable=True)
    thigh = Column(Float, nullable=True)
    calf = Column(Float, nullable=True)
    shoulders = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    unit = Column(String, default="cm", nullable=False, server_default="cm")

    user = relationship("User", back_populates="measurements")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_measurements_per_user_per_day"),
        CheckConstraint("chest > 0", name="chk_measurement_chest_positive"),
        CheckConstraint("waist > 0", name="chk_measurement_waist_positive"),
        CheckConstraint("neck > 0", name="chk_measurement_neck_positive"),
        CheckConstraint("hip > 0", name="chk_measurement_hip_positive"),
        CheckConstraint("arm > 0", name="chk_measurement_arm_positive"),
        CheckConstraint("forearm > 0", name="chk_measurement_forearm_positive"),
        CheckConstraint("thigh > 0", name="chk_measurement_thigh_positive"),
        CheckConstraint("calf > 0", name="chk_measurement_calf_positive"),
        CheckConstraint("shoulders > 0", name="chk_measurement_shoulders_positive"),
    )


class LiftLog(Base):
    """One row = one logged set."""
    __tablename__ = "lift_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("workout_sessions.id"), nullable=True, index=True)
    date = Column(Date, nullable=False, default=date.today)
    weight_kg = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    rpe = Column(Float, nullable=True)
    set_number = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="lift_logs")
    exercise = relationship("Exercise")
    session = relationship("WorkoutSession", back_populates="lift_logs")

    __table_args__ = (
        CheckConstraint("weight_kg >= 0", name="chk_lift_weight_nonnegative"),
        CheckConstraint("reps > 0", name="chk_lift_reps_positive"),
        CheckConstraint("rpe >= 0 AND rpe <= 10", name="chk_lift_rpe_range"),
    )


class CalorieLog(Base):
    __tablename__ = "calorie_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    calories = Column(Float, nullable=False)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fats_g = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="calorie_logs")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_calories_per_user_per_day"),
        CheckConstraint("calories >= 0", name="chk_calories_nonnegative"),
        CheckConstraint("protein_g >= 0", name="chk_protein_nonnegative"),
        CheckConstraint("carbs_g >= 0", name="chk_carbs_nonnegative"),
        CheckConstraint("fats_g >= 0", name="chk_fats_nonnegative"),
    )


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_type = Column(String, nullable=False) # 'weight', 'nutrition', 'frequency', 'lift'
    
    # Lift Goal
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=True)
    target_weight_kg = Column(Float, nullable=True)
    target_reps = Column(Integer, nullable=True)
    
    # Body Weight Goal
    target_body_weight_kg = Column(Float, nullable=True)
    
    # Nutrition Goal
    target_calories = Column(Float, nullable=True)
    target_protein_g = Column(Float, nullable=True)
    
    # Frequency Goal
    target_workouts_per_week = Column(Integer, nullable=True)
    
    # Shared Fields
    target_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    is_completed = Column(Boolean, default=False, nullable=False, server_default='false')
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="goals")
    exercise = relationship("Exercise")

    __table_args__ = (
        CheckConstraint("target_weight_kg > 0", name="chk_goal_weight_positive"),
        CheckConstraint("target_reps > 0", name="chk_goal_reps_positive"),
        CheckConstraint("target_body_weight_kg > 0", name="chk_goal_bw_positive"),
        CheckConstraint("target_calories >= 0", name="chk_goal_calories_nonnegative"),
        CheckConstraint("target_protein_g >= 0", name="chk_goal_protein_nonnegative"),
        CheckConstraint("target_workouts_per_week > 0", name="chk_goal_workouts_positive"),
    )


# ---------------------------------------------------------------------------
# Workout Templates
# ---------------------------------------------------------------------------

class WorkoutTemplate(Base):
    """
    A named workout plan, e.g. "Push Day A" or "Leg Day".
    Contains an ordered list of exercises with target sets/reps/weight.
    """
    __tablename__ = "workout_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)            # "Push Day A"
    description = Column(Text, nullable=True)        # optional note
    share_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
                        onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="workout_templates")
    exercises = relationship(
        "WorkoutTemplateExercise",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="WorkoutTemplateExercise.position",
    )


class WorkoutTemplateExercise(Base):
    """
    One exercise entry inside a template.
    Stores target sets/reps/weight as guidance during the active workout.
    The user can deviate — actual logged weights come from LiftLog.
    """
    __tablename__ = "workout_template_exercises"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    position = Column(Integer, nullable=False, default=0)   # display order

    # Targets (guidance only — user logs actual values during workout)
    target_sets = Column(Integer, nullable=False, default=3)
    target_reps = Column(Integer, nullable=False, default=10)
    target_weight_kg = Column(Float, nullable=True)         # null = user decides
    rest_seconds = Column(Integer, nullable=False, default=90)  # rest between sets
    notes = Column(Text, nullable=True)                     # e.g. "go to failure"

    template = relationship("WorkoutTemplate", back_populates="exercises")
    exercise = relationship("Exercise")

    __table_args__ = (
        CheckConstraint("target_sets > 0", name="chk_template_sets_positive"),
        CheckConstraint("target_reps > 0", name="chk_template_reps_positive"),
        CheckConstraint("target_weight_kg >= 0", name="chk_template_weight_nonnegative"),
        CheckConstraint("rest_seconds >= 0", name="chk_template_rest_nonnegative"),
    )


class WorkoutSession(Base):
    """
    A record of a completed workout session.
    Created when the user finishes an active workout (template or free).
    The actual set data is stored in LiftLog — this just tracks the session
    metadata for the workout history view.
    """
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id", ondelete="SET NULL"), nullable=True)  # null for free workout
    template_name = Column(String, nullable=False, default="Free Workout")
    date = Column(Date, nullable=False, default=date.today)
    duration_seconds = Column(Integer, nullable=True)
    exercises_count = Column(Integer, nullable=False, default=0)
    sets_count = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="workout_sessions")
    template = relationship("WorkoutTemplate")
    lift_logs = relationship("LiftLog", back_populates="session", cascade="all, delete-orphan")
