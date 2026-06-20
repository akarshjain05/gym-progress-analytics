from datetime import datetime, date, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean,
    UniqueConstraint, Text
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    # Profile fields - all optional, used for BMR/TDEE and unit display.
    # gender accepts "male" / "female" / "other". For "other" we average the
    # male/female Mifflin-St Jeor offset, since the formula has no neutral term.
    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True, default="moderate")
    unit_preference = Column(String, nullable=False, default="kg")  # "kg" or "lb"

    goal_weight_kg = Column(Float, nullable=True)

    weight_logs = relationship("BodyWeightLog", back_populates="user", cascade="all, delete-orphan")
    lift_logs = relationship("LiftLog", back_populates="user", cascade="all, delete-orphan")
    calorie_logs = relationship("CalorieLog", back_populates="user", cascade="all, delete-orphan")
    goal_lifts = relationship("GoalLift", back_populates="user", cascade="all, delete-orphan")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)       # e.g. "compound", "isolation"
    muscle_group = Column(String, nullable=True)    # e.g. "chest", "legs", "back"
    is_custom = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = global/predefined

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

    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_weight_per_user_per_day"),)


class LiftLog(Base):
    """One row = one logged set. Sessions/volume/PRs are aggregated at query time."""
    __tablename__ = "lift_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    weight_kg = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    rpe = Column(Float, nullable=True)  # rate of perceived exertion, 1-10, optional
    set_number = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="lift_logs")
    exercise = relationship("Exercise")


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

    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_calories_per_user_per_day"),)


class GoalLift(Base):
    __tablename__ = "goal_lifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False, index=True)
    target_weight_kg = Column(Float, nullable=False)
    target_reps = Column(Integer, nullable=True, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="goal_lifts")
    exercise = relationship("Exercise")
