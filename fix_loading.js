const fs = require('fs');
const path = require('path');

const JS_DIR = './frontend/js';
const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));

for (const file of files) {
  const fp = path.join(JS_DIR, file);
  let content = fs.readFileSync(fp, 'utf8');
  let changed = false;

  if (file === 'dashboard.js' || file === 'weight.js' || file === 'nutrition.js' || file === 'analytics.js' || file === 'admin.js') {
    if (!content.includes('window.hideLoading()')) {
      content = content.replace(/(catch\s*\([^)]+\)\s*\{[^}]*\})?\s*\}\s*init\(\);/s, match => {
        return `\n    window.hideLoading && window.hideLoading();\n  }\n\n  init();`;
      });
      changed = true;
    }
  } else if (file === 'goals.js') {
    if (!content.includes('window.hideLoading()')) {
      content = content.replace(/await loadGoals\(\);/g, `await loadGoals();\n  window.hideLoading && window.hideLoading();`);
      changed = true;
    }
  } else if (file === 'library.js') {
    if (!content.includes('window.hideLoading()')) {
      content = content.replace(/renderExercises\(allExercises\);/g, `renderExercises(allExercises);\n      window.hideLoading && window.hideLoading();`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(fp, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
