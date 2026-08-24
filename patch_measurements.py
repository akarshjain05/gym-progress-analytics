import re

with open('frontend/js/measurements.js', 'r') as f:
    content = f.read()

# Remove the unitBtnCm / unitBtnIn toggle HTML
content = re.sub(r'<div style="display:flex; background:var\(--surface-50\);.*?</div>', '', content, flags=re.DOTALL)

# Fix JS that references the buttons and displayUnit
# We'll replace all displayUnit with getLengthUnit()
content = re.sub(r'let displayUnit = localStorage\.getItem\("measurementsUnit"\) \|\| "cm";', '', content)
content = re.sub(r'function updateUnitUI\(\).*?\}', '', content, flags=re.DOTALL)

# Remove button event listeners
content = re.sub(r'document\.getElementById\("unitBtnCm"\).*?\}\);', '', content, flags=re.DOTALL)
content = re.sub(r'document\.getElementById\("unitBtnIn"\).*?\}\);', '', content, flags=re.DOTALL)

# Replace displayUnit references
content = content.replace('displayUnit', 'getLengthUnit()')
content = content.replace('updateUnitUI();', 'document.getElementById("formUnitLabel").textContent = getLengthUnit();')

# When saving data to backend, convert user unit back to CM
fields = ['mChest', 'mWaist', 'mNeck', 'mHip', 'mArm', 'mForearm', 'mThigh', 'mCalf', 'mShoulders']
for field in fields:
    # Instead of parseVal(val) with conditionals, we will do userUnitToCm
    content = content.replace(f'parseFloat(document.getElementById("{field}").value)', f'userUnitToCm(document.getElementById("{field}").value)')

# Now fix parseVal definition
# The current parseVal function inside measurements.js multiplies by 2.54 if displayUnit === "in"
content = re.sub(r'function parseVal\(val\) \{.*?return Number\(val\.toFixed\(1\)\);\n\}', '', content, flags=re.DOTALL)
# And replace calls to parseVal:
content = content.replace('parseVal(parseFloat', 'userUnitToCm(document.getElementById') 
content = content.replace('parseVal(', 'userUnitToCm(')

with open('frontend/js/measurements.js', 'w') as f:
    f.write(content)
