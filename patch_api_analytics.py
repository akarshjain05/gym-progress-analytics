import re

with open('frontend/js/api.js', 'r') as f:
    content = f.read()

content = content.replace(
    'dashboard() { return apiRequest("/analytics/dashboard"); },',
    'dashboard() { return apiRequest("/analytics/dashboard"); },\n  volume() { return apiRequest("/analytics/volume"); },\n  muscleVolume() { return apiRequest("/analytics/muscle_volume"); },'
)

with open('frontend/js/api.js', 'w') as f:
    f.write(content)
