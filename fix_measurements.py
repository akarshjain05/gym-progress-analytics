import re

with open('frontend/js/measurements.js', 'r') as f:
    content = f.read()

content = content.replace('let getLengthUnit() = localStorage.getItem("ironlog_measurements_unit") || "cm";', '')

# For getVal:
# The backend doesn't return `log.unit`. The backend schema returns the values in `cm`.
# So we can just use `fmtCm(log[metric])` instead of `getVal(log, metric)` entirely!
getVal_pattern = re.compile(r'function getVal.*?return Number\(val\.toFixed\(1\)\);\n\}', re.DOTALL)
content = getVal_pattern.sub('', content)

# But wait, it's used in renderTable and for the chart. Let's provide a safe getVal replacement.
safe_getVal = """function getVal(log, metric) {
  if (log[metric] === null || log[metric] === undefined) return null;
  return Number(cmToUserUnit(log[metric]).toFixed(1));
}
"""

content = content.replace('function renderTable', safe_getVal + '\nfunction renderTable')

with open('frontend/js/measurements.js', 'w') as f:
    f.write(content)
