import re

with open('frontend/js/lifts.js', 'r') as f:
    content = f.read()

# Replace input parsing
content = content.replace('parseFloat(row.querySelector(".set-weight-input").value)', 'userUnitToKg(row.querySelector(".set-weight-input").value)')
content = content.replace('parseFloat(document.getElementById("editSetWeight").value)', 'userUnitToKg(document.getElementById("editSetWeight").value)')

# Replace rendering values
content = content.replace('document.getElementById("editSetWeight").value = log.weight_kg;', 'document.getElementById("editSetWeight").value = kgToUserUnit(log.weight_kg).toFixed(1);')

# Replace placeholder
content = content.replace('placeholder="kg"', 'placeholder="${escapeHtml(getUserUnit())}"')

# Replace string concats
content = content.replace(' + "kg"', ' + getUserUnit()')
content = content.replace(' + " kg"', ' + " " + getUserUnit()')
content = content.replace('"kg"', 'getUserUnit()')
# Wait, "kg" replacement needs to be careful not to replace something else.
content = content.replace('>kg<', '>${escapeHtml(getUserUnit())}<')
content = content.replace('}kg', '} ${escapeHtml(getUserUnit())}')

# Replace fixed template variables
content = content.replace('${escapeHtml(set.weight_kg)} kg', '${escapeHtml(formatWeight(set.weight_kg))}')
content = content.replace('fmtKg(data.personal_record_1rm_kg) + " kg"', 'formatWeight(data.personal_record_1rm_kg)')
content = content.replace('fmtKg(pr.estimated_1rm_kg))} <span class="pr-unit">kg</span>', 'formatWeight(pr.estimated_1rm_kg))} <span class="pr-unit"></span>')
content = content.replace('${escapeHtml(pr.achieved_with.weight_kg)}kg', '${escapeHtml(formatWeight(pr.achieved_with.weight_kg))}')
content = content.replace('${escapeHtml(val)}kg', '${escapeHtml(formatWeight(val))}')
content = content.replace('${escapeHtml(pr)}kg', '${escapeHtml(formatWeight(pr))}')
content = content.replace('vol · Best 1RM: ${escapeHtml(session.best_1rm_kg)} kg', 'vol · Best 1RM: ${escapeHtml(formatWeight(session.best_1rm_kg))}')
content = content.replace('${escapeHtml(session.volume_kg)} kg', '${escapeHtml(formatWeight(session.volume_kg))}')

# Edit Modal label
content = content.replace('Weight (kg)', 'Weight')

# Tooltip 1RM
content = content.replace('Est. 1RM (kg)', 'Est. 1RM')
content = content.replace('Est. 1RM: ${escapeHtml(ctx.parsed.y)} kg', 'Est. 1RM: ${escapeHtml(formatWeight(ctx.parsed.y))}')

# PR value
content = content.replace('fmtKg(data.latest_session_1rm_kg);', 'formatWeight(data.latest_session_1rm_kg);')
content = content.replace('fmtKg(data.personal_record_1rm_kg);', 'formatWeight(data.personal_record_1rm_kg);')


with open('frontend/js/lifts.js', 'w') as f:
    f.write(content)
