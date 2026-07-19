const fs = require('fs');
let text = fs.readFileSync('frontend/js/api.js', 'utf8');
if (!text.includes('nextEta(')) {
    text = text.replace('    dashboard: () => request("/dashboard"),', '    dashboard: () => request("/dashboard"),\n    nextEta: () => request("/coach/next-eta"),');
    fs.writeFileSync('frontend/js/api.js', text, 'utf8');
}
