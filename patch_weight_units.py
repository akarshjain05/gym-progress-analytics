import re

with open('frontend/js/weight.js', 'r') as f:
    content = f.read()

# Replace input labels "Weight (kg)" -> "Weight (" + getUserUnit() + ")"
content = content.replace('Weight (kg)', 'Weight (<span class="display-unit"></span>)')

# Fix the value retrieval on save: userUnitToKg
content = content.replace('parseFloat(document.getElementById("wWeight").value)', 'userUnitToKg(document.getElementById("wWeight").value)')

# Fix <span class="unit">kg</span> -> <span class="unit">${escapeHtml(getUserUnit())}</span>
content = content.replace('<span class="unit">kg</span>', '<span class="unit">${escapeHtml(getUserUnit())}</span>')

# Fix other " kg" string literals
content = content.replace('} kg</div>', '} ${escapeHtml(getUserUnit())}</div>')
content = content.replace('} kg/wk', '} ${escapeHtml(getUserUnit())}/wk')
content = content.replace(' + " kg"', ' + " " + getUserUnit()')
content = content.replace('" kg"', '" " + getUserUnit()')
content = content.replace(', " kg"', ', " " + getUserUnit()')
content = content.replace(', " kg/wk"', ', " " + getUserUnit() + "/wk"')

# Replace in labels for chart
content = content.replace('label: "Weight"', 'label: "Weight (" + getUserUnit() + ")"')
content = content.replace('label: "Weight", render: l => `${escapeHtml(fmtKg(l.weight_kg))} kg`', 'label: "Weight", render: l => `${escapeHtml(fmtKg(l.weight_kg))} ${escapeHtml(getUserUnit())}`')

with open('frontend/js/weight.js', 'w') as f:
    f.write(content)
