import re

with open('frontend/js/analytics.js', 'r') as f:
    content = f.read()

# Add the TIER_BADGE and loadStrengthPercentiles right before loadInsights
percentile_js = """
const TIER_BADGE = {
  beginner: "badge-grey", novice: "badge-blue", intermediate: "badge-green",
  advanced: "badge-gold", elite: "badge-red",
};

async function loadStrengthPercentiles() {
  const container = document.getElementById("percentileList");
  try {
    const res = await Api.strengthPercentiles();

    if (!res.available) {
      const linkHref = res.reason === "set_gender" ? "profile.html" : "weight.html";
      const linkText = res.reason === "set_gender" ? "Set it in your profile" : "Log your bodyweight";
      container.innerHTML = `
        <div class="percentile-empty">
          <div class="text-secondary" style="margin-bottom:6px;">${escapeHtml(res.message)}</div>
          <a href="${linkHref}">${linkText} &rarr;</a>
        </div>`;
      return;
    }

    if (res.lifts.length === 0) {
      container.innerHTML = `
        <div class="percentile-empty">
          <div class="text-secondary">Log a few sets on a main lift (bench, squat, deadlift, OHP, rows) to see where you stand.</div>
        </div>`;
      return;
    }

    container.innerHTML = res.lifts.map(l => `
      <div class="percentile-row">
        <div class="percentile-row-head">
          <div class="percentile-exercise-name">${escapeHtml(l.exercise)}</div>
          <span class="badge ${TIER_BADGE[l.tier] || 'badge-grey'}">${escapeHtml(l.tier || 'unranked')}</span>
        </div>
        <div class="percentile-stat" style="margin-bottom:8px;">
          Stronger than <strong>${l.percentile}%</strong> of lifters your bodyweight
          <span class="text-tertiary">(est. 1RM ${l.best_estimated_1rm_kg}kg)</span>
        </div>
        <div class="percentile-track">
          <div class="percentile-marker" style="left:${l.percentile}%;"></div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    handleApiError(err);
  }
}
"""

content = content.replace("async function loadInsights() {", percentile_js + "\nasync function loadInsights() {")

# Insert HTML into DOM
percentile_html = """
  <div class="card mb-16">
    <div class="card-title">Where you stand <span class="text-tertiary" style="font-weight:400;">(strength percentile by lift)</span></div>
    <div id="percentileList"></div>
  </div>
"""

content = content.replace('<div class="bar-divider"', percentile_html + '\n  <div class="bar-divider"')

# Add function call at the end
content += "\nloadStrengthPercentiles();\n"

with open('frontend/js/analytics.js', 'w') as f:
    f.write(content)

