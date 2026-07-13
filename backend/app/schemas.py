from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Gender = Literal["male", "female", "other"]
ActivityLevel = Literal["sedentary", "light", "moderate", "active", "very_active"]
UnitPref = Literal["kg", "lb"]


# ---------- Auth ----------

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleLoginIn(BaseModel):
    id_token: str  # the credential JWT returned by Google Identity Services on the frontend


class GoogleLoginOut(BaseModel):
    needs_setup: bool
    access_token: Optional[str] = None
    token_type: str = "bearer"
    setup_token: Optional[str] = None  # present only when needs_setup is True
    email: Optional[str] = None


class CompleteGoogleSignupIn(BaseModel):
    setup_token: str
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6)


class VerifyEmailIn(BaseModel):
    token: str


class ResendVerificationIn(BaseModel):
    email: str


# ---------- Profile ----------

class ProfileUpdate(BaseModel):
    gender: Optional[Gender] = None
    age: Optional[int] = Field(default=None, ge=10, le=100)
    height_cm: Optional[float] = Field(default=None, gt=0, le=300)
    activity_level: Optional[ActivityLevel] = None
    unit_preference: Optional[UnitPref] = None
    goal_weight_kg: Optional[float] = Field(default=None, gt=0)
    sidebar_collapsed: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    username: Optional[str] = None
    email: str
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    unit_preference: str
    goal_weight_kg: Optional[float] = None
    sidebar_collapsed: bool = False
    has_google_login: bool = False
    has_password: bool = False
    role: str = "user"

    model_config = ConfigDict(from_attributes=True)


class AdminUserOut(UserOut):
    created_at: datetime
    failed_login_attempts: int
    locked_until: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- Body weight ----------

class WeightLogIn(BaseModel):
    date: date
    weight_kg: float = Field(gt=0, le=400)
    body_fat_pct: Optional[float] = Field(default=None, ge=0, le=80)
    notes: Optional[str] = None


class WeightLogOut(WeightLogIn):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Exercises ----------

class ExerciseIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    category: Optional[str] = None
    muscle_group: Optional[str] = None


class ExerciseOut(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    muscle_group: Optional[str] = None
    is_custom: bool

    model_config = ConfigDict(from_attributes=True)


# ---------- Lift logs ----------

class LiftLogIn(BaseModel):
    exercise_id: int
    date: date
    weight_kg: float = Field(ge=0, le=600)
    reps: int = Field(gt=0, le=100)
    rpe: Optional[float] = Field(default=None, ge=1, le=10)
    set_number: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("rpe")
    @classmethod
    def round_rpe(cls, v):
        return round(v * 2) / 2 if v is not None else v  # snap to nearest 0.5

class LiftLogUpdate(BaseModel):
    weight_kg: Optional[float] = Field(None, ge=0, le=600)
    reps: Optional[int] = Field(None, gt=0, le=100)
    rpe: Optional[float] = Field(default=None, ge=1, le=10)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("rpe")
    @classmethod
    def round_rpe(cls, v):
        return round(v * 2) / 2 if v is not None else v


class LiftLogOut(LiftLogIn):
    id: int

    model_config = ConfigDict(from_attributes=True)

class SetEntry(BaseModel):
    """One set within a logged session - weight/reps/rpe only, no date/exercise
    (those are shared across the whole session, see LiftSessionIn below)."""
    weight_kg: float = Field(ge=0, le=600)
    reps: int = Field(gt=0, le=100)
    rpe: Optional[float] = Field(default=None, ge=1, le=10)

    @field_validator("rpe")
    @classmethod
    def round_rpe(cls, v):
        return round(v * 2) / 2 if v is not None else v


class LiftSessionIn(BaseModel):
    """Log an entire session (however many sets) for one exercise on one date
    in a single request. set_number is assigned automatically (1, 2, 3...)
    in the order the sets are given."""
    exercise_id: int
    date: date
    notes: Optional[str] = None
    sets: list[SetEntry] = Field(min_length=1, max_length=20)


# ---------- Calorie logs ----------

class CalorieLogIn(BaseModel):
    date: date
    calories: float = Field(ge=0, le=15000)
    protein_g: Optional[float] = Field(default=None, ge=0, le=1000)
    carbs_g: Optional[float] = Field(default=None, ge=0, le=2000)
    fats_g: Optional[float] = Field(default=None, ge=0, le=1000)
    notes: Optional[str] = None


class CalorieLogOut(CalorieLogIn):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Goals ----------

class GoalLiftIn(BaseModel):
    exercise_id: int
    target_weight_kg: float = Field(gt=0, le=600)
    target_reps: Optional[int] = Field(default=1, gt=0, le=100)


class GoalLiftOut(GoalLiftIn):
    id: int

    model_config = ConfigDict(from_attributes=True)