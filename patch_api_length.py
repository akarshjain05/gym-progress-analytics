import re

with open('frontend/js/api.js', 'r') as f:
    content = f.read()

helpers_new = """
function getLengthUnit() {
  const u = Auth.getUser();
  return u && u.unit_preference === 'lbs' ? 'in' : 'cm';
}

function cmToUserUnit(cm) {
  if (cm === null || cm === undefined) return null;
  const unit = getLengthUnit();
  return unit === 'in' ? cm / 2.54 : cm;
}

function userUnitToCm(val) {
  if (val === null || val === undefined || val === "") return null;
  const unit = getLengthUnit();
  return unit === 'in' ? parseFloat(val) * 2.54 : parseFloat(val);
}

function fmtCm(v, decimals = 1) {
  if (v === null || v === undefined) return "—";
  const converted = cmToUserUnit(v);
  return Number(converted).toFixed(decimals);
}

function formatLength(cm, decimals = 1) {
  if (cm === null || cm === undefined) return "—";
  return fmtCm(cm, decimals) + " " + getLengthUnit();
}
"""

content = content.replace(
    'function fmtKg(v, decimals = 1) {',
    helpers_new + '\nfunction fmtKg(v, decimals = 1) {'
)

with open('frontend/js/api.js', 'w') as f:
    f.write(content)
