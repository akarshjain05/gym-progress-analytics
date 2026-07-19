const fs = require('fs');
let text = fs.readFileSync('frontend/js/skeleton.js', 'utf8');

// Replace history repeat(3) with repeat(10)
text = text.replace(/\$\{repeat\(3,\s*'<(div class="sk-row sk-mt10">|<div class="sk-row">).+?'\)\}/g, match => {
  return match.replace('repeat(3', 'repeat(10');
});

// Workout template cards: repeat(4) to repeat(8)
text = text.replace(/\$\{repeat\(4,\s*'<div class="sk-card-inner">.+?'\)\}/g, match => {
  return match.replace('repeat(4', 'repeat(8');
});

// Generic generic layout: repeat(4) to repeat(12)
text = text.replace(/\$\{repeat\(4,\s*'<div class="sk-row sk-mt10"><div class="sk-line sk-line-lg">.+?'\)\}/g, match => {
  return match.replace('repeat(4', 'repeat(12');
});

fs.writeFileSync('frontend/js/skeleton.js', text, 'utf8');
