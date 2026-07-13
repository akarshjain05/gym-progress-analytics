from fastapi import APIRouter, Depends
from .. import schemas, calculations

router = APIRouter(prefix="/calculators", tags=["calculators"])


@router.post("/body-metrics", response_model=schemas.BodyMetricsOut)
def calc_body_metrics(data: schemas.BodyMetricsIn):
    bmi_res = calculations.calculate_bmi(data.weight_kg, data.height_cm)
    ibw = calculations.calculate_ideal_body_weight(data.height_cm, data.gender)
    lbm = calculations.calculate_lean_body_mass(data.weight_kg, data.height_cm, data.gender)
    
    if lbm is not None:
        ffmi_res = calculations.calculate_ffmi(lbm, data.height_cm)
    else:
        ffmi_res = {"value": 0.0, "normalized": 0.0, "category": "Invalid"}
        
    return schemas.BodyMetricsOut(
        bmi=bmi_res,
        ibw_kg=ibw,
        lbm_kg=lbm,
        ffmi=ffmi_res
    )


@router.post("/powerlifting", response_model=schemas.PowerliftingOut)
def calc_powerlifting_scores(data: schemas.PowerliftingIn):
    wilks = calculations.calculate_wilks(data.weight_kg, data.total_kg, data.gender)
    dots = calculations.calculate_dots(data.weight_kg, data.total_kg, data.gender)
    
    return schemas.PowerliftingOut(
        wilks_score=wilks,
        dots_score=dots
    )


@router.post("/macros", response_model=schemas.MacrosOut)
def calc_macros(data: schemas.MacrosIn):
    macros = calculations.calculate_macros(data.calories, data.goal)
    return schemas.MacrosOut(**macros)
