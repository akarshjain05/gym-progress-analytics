from datetime import date, datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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
    timezone: Optional[str] = None
    goal_weight_kg: Optional[float] = Field(default=None, gt=0)
    sidebar_collapsed: Optional[bool] = None
    onboarding_completed: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    username: Optional[str] = None
    email: str
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    unit_preference: str
    timezone: str = "UTC"
    goal_weight_kg: Optional[float] = None
    sidebar_collapsed: bool = False
    onboarding_completed: bool = False
    has_google_login: bool = False
    has_password: bool = False
    role: str = "user"

    model_config = ConfigDict(from_attributes=True)


class AdminUserOut(UserOut):
    created_at: datetime
    failed_login_attempts: int
    locked_until: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminStatsOut(BaseModel):
    total_users: int
    total_workouts: int
    total_lift_logs: int
    total_weight_logs: int
    total_goals: int


class AdminLogEntryOut(BaseModel):
    log_id: int
    log_type: str  # 'lift', 'weight', 'workout', 'goal', 'calorie'
    user_id: int
    username: Optional[str] = None
    email: str
    date: date
    description: str


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
    secondary_muscle: Optional[str] = None
    equipment: Optional[str] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None


class ExerciseOut(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    muscle_group: Optional[str] = None
    secondary_muscle: Optional[str] = None
    equipment: Optional[str] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    is_custom: bool

    model_config = ConfigDict(from_attributes=True)

# ---------- Body Measurements ----------

class BodyMeasurementBase(BaseModel):
    date: date
    unit: str = Field(default="cm")
    chest: Optional[float] = Field(default=None, ge=0)
    waist: Optional[float] = Field(default=None, ge=0)
    neck: Optional[float] = Field(default=None, ge=0)
    hip: Optional[float] = Field(default=None, ge=0)
    arm: Optional[float] = Field(default=None, ge=0)
    forearm: Optional[float] = Field(default=None, ge=0)
    thigh: Optional[float] = Field(default=None, ge=0)
    calf: Optional[float] = Field(default=None, ge=0)
    shoulders: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None

class BodyMeasurementCreate(BodyMeasurementBase):
    pass

class BodyMeasurementOut(BodyMeasurementBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------- Calculators ----------

class BodyMetricsIn(BaseModel):
    weight_kg: float = Field(gt=0)
    height_cm: float = Field(gt=0)
    gender: str  # 'male' or 'female'

class BodyMetricsOut(BaseModel):
    bmi: dict
    ibw_kg: Optional[float]
    lbm_kg: Optional[float]
    ffmi: dict

class PowerliftingIn(BaseModel):
    weight_kg: float = Field(gt=0)
    total_kg: float = Field(gt=0)
    gender: str

class PowerliftingOut(BaseModel):
    wilks_score: float
    dots_score: float

class MacrosIn(BaseModel):
    calories: float = Field(gt=0)
    goal: Literal["cut", "maintain", "bulk"]

class MacrosOut(BaseModel):
    protein_g: int
    carbs_g: int
    fat_g: int



# ---------- Lift logs ----------

class LiftLogIn(BaseModel):
    exercise_id: int
    date: date
    weight_kg: float = Field(ge=0, le=600)
    reps: int = Field(gt=0, le=100)
    rpe: Optional[float] = Field(default=None, ge=0, le=10)
    set_number: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("rpe")
    @classmethod
    def round_rpe(cls, v):
        return round(v * 2) / 2 if v is not None else v  # snap to nearest 0.5

class LiftLogUpdate(BaseModel):
    weight_kg: Optional[float] = Field(None, ge=0, le=600)
    reps: Optional[int] = Field(None, gt=0, le=100)
    rpe: Optional[float] = Field(default=None, ge=0, le=10)
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
    rpe: Optional[float] = Field(default=None, ge=0, le=10)

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

class GoalIn(BaseModel):
    goal_type: str
    target_date: Optional[date] = None
    
    exercise_id: Optional[int] = None
    target_weight_kg: Optional[float] = None
    target_reps: Optional[int] = None
    
    target_body_weight_kg: Optional[float] = None
    
    target_calories: Optional[float] = None
    target_protein_g: Optional[float] = None
    

    target_workouts_per_week: Optional[int] = None

    @model_validator(mode='after')
    def validate_goal_type_fields(self):
        t = self.goal_type
        if t == 'lift':
            if not self.exercise_id:
                raise ValueError("exercise_id is required for lift goals")
            if not self.target_weight_kg and not self.target_reps:
                raise ValueError("target_weight_kg or target_reps is required for lift goals")
        elif t == 'weight':
            if not self.target_body_weight_kg:
                raise ValueError("target_body_weight_kg is required for weight goals")
        elif t == 'nutrition':
            if not self.target_calories and not self.target_protein_g:
                raise ValueError("target_calories or target_protein_g is required for nutrition goals")
        elif t == 'frequency':
            if not self.target_workouts_per_week:
                raise ValueError("target_workouts_per_week is required for frequency goals")
        else:
            raise ValueError("Invalid goal_type")
        return self



class GoalOut(BaseModel):
    id: int
    user_id: int
    goal_type: str
    target_date: Optional[date] = None
    created_at: datetime
    is_completed: bool
    completed_at: Optional[datetime] = None
    
    exercise_id: Optional[int] = None
    target_weight_kg: Optional[float] = None
    target_reps: Optional[int] = None
    
    target_body_weight_kg: Optional[float] = None
    
    target_calories: Optional[float] = None
    target_protein_g: Optional[float] = None
    

    target_workouts_per_week: Optional[int] = None

    @model_validator(mode='after')
    def validate_goal_type_fields(self):
        t = self.goal_type
        if t == 'lift':
            if not self.exercise_id:
                raise ValueError("exercise_id is required for lift goals")
            if not self.target_weight_kg and not self.target_reps:
                raise ValueError("target_weight_kg or target_reps is required for lift goals")
        elif t == 'weight':
            if not self.target_body_weight_kg:
                raise ValueError("target_body_weight_kg is required for weight goals")
        elif t == 'nutrition':
            if not self.target_calories and not self.target_protein_g:
                raise ValueError("target_calories or target_protein_g is required for nutrition goals")
        elif t == 'frequency':
            if not self.target_workouts_per_week:
                raise ValueError("target_workouts_per_week is required for frequency goals")
        else:
            raise ValueError("Invalid goal_type")
        return self


    model_config = ConfigDict(from_attributes=True)
# ---------- Coach ETA ----------
class ETAOut(BaseModel):
    exercise_name: str
    target_kg: float
    source: str # "goal" or "next_milestone"
    date: str
    days_away: int
    sessions_away: int


# ---------- Workout Templates ----------

class TemplateExerciseIn(BaseModel):
    exercise_id: int
    position: int = 0
    target_sets: int = Field(default=3, ge=1, le=20)
    target_reps: int = Field(default=10, ge=1, le=100)
    target_weight_kg: Optional[float] = Field(default=None, ge=0, le=600)
    rest_seconds: int = Field(default=90, ge=0, le=600)
    notes: Optional[str] = None


class TemplateExerciseUpdate(BaseModel):
    position: Optional[int] = None
    target_sets: Optional[int] = Field(default=None, ge=1, le=20)
    target_reps: Optional[int] = Field(default=None, ge=1, le=100)
    target_weight_kg: Optional[float] = Field(default=None, ge=0, le=600)
    rest_seconds: Optional[int] = Field(default=None, ge=0, le=600)
    notes: Optional[str] = None


class TemplateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: Optional[str] = None
    exercises: list[TemplateExerciseIn] = []


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    description: Optional[str] = None
    exercises: Optional[list[TemplateExerciseIn]] = None


class ReorderIn(BaseModel):
    # List of template_exercise IDs in the new desired order
    ordered_ids: list[int]


# Logged set submitted when finishing a workout
class LoggedSet(BaseModel):
    weight_kg: float = Field(ge=0, le=600)
    reps: int = Field(ge=1, le=100)
    rpe: Optional[float] = Field(default=None, ge=0, le=10)
    completed: bool = True   # False = user skipped this set


class LoggedExercise(BaseModel):
    exercise_id: int
    sets: list[LoggedSet]
    notes: Optional[str] = None


class FinishWorkoutIn(BaseModel):
    date: date
    duration_seconds: Optional[int] = None   # total workout duration
    exercises: list[LoggedExercise]
    notes: Optional[str] = None


class SessionNotesIn(BaseModel):
    notes: str = ""
