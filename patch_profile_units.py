import re

with open('frontend/js/profile.js', 'r') as f:
    content = f.read()

# Fix the render step for goal weight
content = content.replace(
    'document.getElementById("pGoal").value = user.goal_weight_kg ?? "";',
    'document.getElementById("pGoal").value = user.goal_weight_kg ? Number(kgToUserUnit(user.goal_weight_kg).toFixed(1)) : "";'
)
# Fix the render step for height
content = content.replace(
    'document.getElementById("pHeight").value = user.height_cm ?? "";',
    'document.getElementById("pHeight").value = user.height_cm ? Number(cmToUserUnit(user.height_cm).toFixed(1)) : "";'
)

# Fix the save step
content = content.replace(
    'height_cm: document.getElementById("pHeight").value ? parseFloat(document.getElementById("pHeight").value) : null,',
    'height_cm: document.getElementById("pHeight").value ? userUnitToCm(document.getElementById("pHeight").value) : null,'
)
content = content.replace(
    'goal_weight_kg: document.getElementById("pGoal").value ? parseFloat(document.getElementById("pGoal").value) : null,',
    'goal_weight_kg: document.getElementById("pGoal").value ? userUnitToKg(document.getElementById("pGoal").value) : null,'
)

# Fix labels
content = content.replace('Height (cm)', 'Height (<span class="len-unit">cm</span>)')
content = content.replace('Goal Weight (kg)', 'Goal Weight (<span class="w-unit">kg</span>)')

# In loadProfile, update the spans
update_spans = """    document.getElementById("pUnit").value = user.unit_preference || "kg";
    document.querySelectorAll('.len-unit').forEach(el => el.textContent = getLengthUnit());
    document.querySelectorAll('.w-unit').forEach(el => el.textContent = getUserUnit());"""
content = content.replace('    document.getElementById("pUnit").value = user.unit_preference || "kg";', update_spans)

with open('frontend/js/profile.js', 'w') as f:
    f.write(content)
