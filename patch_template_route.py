import re

with open('backend/app/routers/workout_templates.py', 'r') as f:
    content = f.read()

func_old = """def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    if payload.name is not None:
        t.name = payload.name.strip()
    if payload.description is not None:
        t.description = payload.description
    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(t)
    return _template_out(t)"""

func_new = """def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = _get_template(db, template_id, current_user)
    if payload.name is not None:
        t.name = payload.name.strip()
    if payload.description is not None:
        t.description = payload.description
        
    if payload.exercises is not None:
        # Delete old exercises
        db.query(models.WorkoutTemplateExercise).filter(
            models.WorkoutTemplateExercise.template_id == t.id
        ).delete()
        # Insert new ones
        for ex in payload.exercises:
            te = models.WorkoutTemplateExercise(
                template_id=t.id,
                exercise_id=ex.exercise_id,
                position=ex.position,
                target_sets=ex.target_sets,
                target_reps=ex.target_reps,
                target_weight_kg=ex.target_weight_kg,
                rest_seconds=ex.rest_seconds,
                notes=ex.notes,
            )
            db.add(te)
            
    t.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(t)
    return _template_out(t)"""

content = content.replace(func_old, func_new)

with open('backend/app/routers/workout_templates.py', 'w') as f:
    f.write(content)
