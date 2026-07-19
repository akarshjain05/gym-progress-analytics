const fs = require('fs');
const fp = './frontend/js/workout.js';
let content = fs.readFileSync(fp, 'utf8');

content = content.replace(/loadHistory\(\);/, 'await loadHistory();');
fs.writeFileSync(fp, content, 'utf8');
