const fs = require('fs');

let text = fs.readFileSync('frontend/js/dashboard.js', 'utf8');

const search1 = `    const [dash, weightSummary] = await Promise.all([
      Api.dashboard(),
      Api.weightSummary(),
    ]);`;

const replace1 = `    const [dash, weightSummary, nextEta] = await Promise.all([
      Api.dashboard(),
      Api.weightSummary(),
      Api.nextEta(),
    ]);`;

text = text.replace(search1, replace1);

const search2 = `    // ---- weight delta ----`;

const replace2 = `
    let etaHtml = "";
    if (nextEta) {
      const dateStr = new Date(nextEta.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      etaHtml = \`
        <div class="card" style="margin-bottom: 1.5rem; background: var(--bg-secondary); border-left: 4px solid var(--plate-red);">
          <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">At your current rate, you'll \${nextEta.exercise_name.toLowerCase()} \${nextEta.target_kg}kg by \${dateStr}</div>
          <div style="font-size: 0.9rem; color: var(--text-tertiary);">\${nextEta.days_away} days away</div>
        </div>
      \`;
    }

    // ---- weight delta ----`;

text = text.replace(search2, replace2);

const search3 = `        <div id="wrappedBanner"`;

const replace3 = `        \${etaHtml}
        <div id="wrappedBanner"`;

text = text.replace(search3, replace3);

fs.writeFileSync('frontend/js/dashboard.js', text, 'utf8');
