import re

with open('frontend/js/analytics.js', 'r') as f:
    content = f.read()

# Replace loadVolumeChart
vol_old = """async function loadVolumeChart() {
  const ctx = document.getElementById("volumeCanvas");
  try {
    const logs = await Api.listLifts();
    if (!logs.length) {
      ctx.parentElement.innerHTML = DOMPurify.sanitize(`<div class="card-title">Weekly training volume</div><div class="empty-state"><p>Log some sets to see weekly volume.</p></div>`);
      return;
    }
    const byWeek = {};
    for (const l of logs) {
      const wk = isoWeekLabel(l.date);
      byWeek[wk] = (byWeek[wk] || 0) + l.weight_kg * l.reps;
    }
    const weeks = Object.keys(byWeek).sort();

    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: weeks.map(w => fmtDate(w)),
        datasets: [{
          label: "Volume (kg)",
          data: weeks.map(w => Math.round(byWeek[w])),
          backgroundColor: "#E2402D",
          borderRadius: 4,
        }],
      },"""

vol_new = """async function loadVolumeChart() {
  const ctx = document.getElementById("volumeCanvas");
  try {
    const data = await Api.volume();
    if (!data.length) {
      ctx.parentElement.innerHTML = DOMPurify.sanitize(`<div class="card-title">Weekly training volume</div><div class="empty-state"><p>Log some sets to see weekly volume.</p></div>`);
      return;
    }

    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(d => fmtDate(d.week_label)),
        datasets: [{
          label: "Volume",
          data: data.map(d => Math.round(kgToUserUnit(d.volume))),
          backgroundColor: "#E2402D",
          borderRadius: 4,
        }],
      },"""

content = content.replace(vol_old, vol_new)

# Replace loadMuscleGroupChart
muscle_old = """async function loadMuscleGroupChart() {
  const ctx = document.getElementById("muscleCanvas");
  try {
    const logs = await Api.listLifts();
    if (!logs.length) {
      ctx.parentElement.style.display = "none";
      return;
    }
    
    // We need to fetch exercises to map to muscle groups...
    // Actually, Api.listLifts doesn't return muscle_group directly without joined load in standard list (unless we modified it).
    // Let's assume we fetch templates or just rely on a backend endpoint.
    // WAIT, actually the current codebase does a very hacky match or doesn't work well!
    // We will replace it entirely to use our new endpoint.
"""
# Since I don't know the exact string, let's use regex
content = re.sub(
    r'async function loadMuscleGroupChart\(\) \{.*?\}\);[^}]*\} catch',
    """async function loadMuscleGroupChart() {
  const ctx = document.getElementById("muscleCanvas");
  try {
    const mgData = await Api.muscleVolume();
    const labels = Object.keys(mgData);
    if (!labels.length) {
      ctx.parentElement.style.display = "none";
      return;
    }
    const data = labels.map(k => Math.round(kgToUserUnit(mgData[k])));

    if (muscleChart) muscleChart.destroy();
    muscleChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels.map(capitalize),
        datasets: [{
          data: data,
          backgroundColor: ["#E2402D", "#D4A33B", "#4F9D69", "#3E7CB1", "#a09880", "#6b7280", "#C9CCD1"],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "right", labels: { color: chartColors().legend, boxWidth: 12, font: { size: 12 } } },
        },
        cutout: "70%",
      },
    });
  } catch""",
    content,
    flags=re.DOTALL
)

with open('frontend/js/analytics.js', 'w') as f:
    f.write(content)
