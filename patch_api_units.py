import re

with open('frontend/js/api.js', 'r') as f:
    content = f.read()

helpers_new = """
// --- small formatting helpers used across pages ---
function getUserUnit() {
  const u = Auth.getUser();
  return u && u.unit_preference === 'lbs' ? 'lbs' : 'kg';
}

function kgToUserUnit(kg) {
  if (kg === null || kg === undefined) return null;
  const unit = getUserUnit();
  return unit === 'lbs' ? kg * 2.20462 : kg;
}

function userUnitToKg(val) {
  if (val === null || val === undefined || val === "") return null;
  const unit = getUserUnit();
  return unit === 'lbs' ? parseFloat(val) / 2.20462 : parseFloat(val);
}

function fmtKg(v, decimals = 1) {
  if (v === null || v === undefined) return "—";
  const converted = kgToUserUnit(v);
  return Number(converted).toFixed(decimals);
}

function formatWeight(kg, decimals = 1) {
  if (kg === null || kg === undefined) return "—";
  return fmtKg(kg, decimals) + " " + getUserUnit();
}
"""

content = content.replace(
    '// --- small formatting helpers used across pages ---\nfunction fmtKg(v, decimals = 1) {\n  if (v === null || v === undefined) return "—";\n  return Number(v).toFixed(decimals);\n}',
    helpers_new
)

with open('frontend/js/api.js', 'w') as f:
    f.write(content)
