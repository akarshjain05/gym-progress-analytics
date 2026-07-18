renderShell("analytics", "Analytics", "The full picture, pulled together.");

let changeChart = null, volumeChart = null, weightTrendChart = null, muscleVolumeChart = null;

// Theme-aware chart colors
function chartColors() {
  const isDark = !document.documentElement.getAttribute('data-theme') ||
                  document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    tick:     isDark ? '#6b7280' : '#78716c',
    tickY:    isDark ? '#9ca5ac' : '#57534e',
    grid:     isDark ? 'rgba(242,240,234,0.05)' : 'rgba(0,0,0,0.06)',
    legend:   isDark ? '#9ca5ac' : '#57534e',
  };
}

// One color per muscle group keeps the bars visually distinguishable rather
// than all-one-color, without needing a full design pass per group.
const MUSCLE_GROUP_COLORS = {
  chest: "#E2402D", back: "#3E7CB1", shoulders: "#D4A33B", biceps: "#4F9D69",
  triceps: "#8B6BB7", legs: "#C9CCD1", quads: "#5FA8D3", hamstrings: "#E08A6B",
  glutes: "#D46BA3", calves: "#7BAE7F", abs: "#B0A458", other: "#6B7480",
};

document.getElementById("pageContent").innerHTML = `
  <div class="bar-divider" style="margin-top:0;"><div class="collar"></div><div class="rail"></div><div class="label">All insights</div><div class="rail"></div><div class="collar"></div></div>
  <div class="card mb-16"><ul class="insight-list" id="fullInsightList"></ul></div>

  <div class="card mb-16">
    <div class="card-title">Where you stand <span class="text-tertiary" style="font-weight:400;">(strength percentile by lift)</span></div>
    <div id="percentileList"></div>
  </div>

  <div class="grid grid-2 mb-16">
    <div class="card">
      <div class="card-title">Strength change by exercise <span class="text-tertiary" style="font-weight:400;">(90 days)</span></div>
      <canvas id="changeCanvas" height="100"></canvas>
    </div>
    <div class="card">
      <div class="card-title">Weight trend</div>
      <canvas id="weightTrendCanvas" height="100"></canvas>
    </div>
  </div>

  <div class="card mb-16">
    <div class="card-title">Weekly training volume <span class="text-tertiary" style="font-weight:400;">(all lifts, kg × reps)</span></div>
    <canvas id="volumeCanvas" height="80"></canvas>
  </div>

  <div class="card">
    <div class="card-title">Volume by muscle group <span class="text-tertiary" style="font-weight:400;">(all-time, kg × reps)</span></div>
    <canvas id="muscleVolumeCanvas" height="100"></canvas>
  </div>
`;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

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

async function loadInsights() {
  const list = document.getElementById("fullInsightList");
  try {
    const res = await Api.insights();
    list.innerHTML = res.insights.map(line => `
      <li class="insight-item"><div class="insight-dot"></div><div>${escapeHtml(line)}</div></li>
    `).join("");
  } catch (err) {
    handleApiError(err);
  }
}

async function loadChangeChart() {
  const ctx = document.getElementById("changeCanvas");
  try {
    const exercises = await Api.listExercises();
    const prsResponse = await Api.personalRecords();
    const prs = Array.isArray(prsResponse) ? prsResponse : (prsResponse.flat || []);
    const loggedIds = new Set(prs.map(p => p.exercise_id));
    const relevant = exercises.filter(e => loggedIds.has(e.id));

    const results = await Promise.all(relevant.map(e => Api.liftProgress(e.id)));
    const points = relevant
      .map((e, i) => ({ name: e.name, change: results[i].change_pct }))
      .filter(p => p.change !== null && p.change !== undefined)
      .sort((a, b) => b.change - a.change);

    if (!points.length) {
      ctx.parentElement.innerHTML = `<div class="card-title">Strength change by exercise</div><div class="empty-state"><p>Log the same exercise on at least two different days to see change here.</p></div>`;
      return;
    }

    if (changeChart) changeChart.destroy();
    changeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: points.map(p => p.name),
        datasets: [{
          data: points.map(p => p.change),
          backgroundColor: points.map(p => p.change >= 0 ? "#4F9D69" : "#C9594A"),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: chartColors().tick, font: { size: 11 }, callback: (v) => v + "%" }, grid: { color: chartColors().grid } },
          y: { ticks: { color: chartColors().tickY, font: { size: 12 } }, grid: { display: false } },
        },
      },
    });
  } catch (err) {
    handleApiError(err);
  }
}

async function loadWeightTrend() {
  const ctx = document.getElementById("weightTrendCanvas");
  try {
    const summary = await Api.weightSummary();
    if (!summary.has_data) {
      ctx.parentElement.innerHTML = `<div class="card-title">Weight trend</div><div class="empty-state"><p>No weight logs yet.</p></div>`;
      return;
    }
    if (weightTrendChart) weightTrendChart.destroy();
    weightTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: summary.series.map(s => fmtDate(s.date)),
        datasets: [{
          label: "Trailing avg (7 logs)",
          data: summary.series.map(s => s.moving_avg_7d),
          borderColor: "#3E7CB1",
          backgroundColor: "rgba(62,124,177,0.08)",
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.3,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { color: chartColors().grid } },
          y: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { color: chartColors().grid } },
        },
      },
    });
  } catch (err) {
    handleApiError(err);
  }
}

function isoWeekLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  // Monday-anchored week start
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

async function loadVolumeChart() {
  const ctx = document.getElementById("volumeCanvas");
  try {
    const logs = await Api.listLifts();
    if (!logs.length) {
      ctx.parentElement.innerHTML = `<div class="card-title">Weekly training volume</div><div class="empty-state"><p>Log some sets to see weekly volume.</p></div>`;
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
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { color: chartColors().grid } },
        },
      },
    });
  } catch (err) {
    handleApiError(err);
  }
}

async function loadMuscleGroupVolumeChart() {
  const ctx = document.getElementById("muscleVolumeCanvas");
  try {
    const [logs, exercisesList] = await Promise.all([Api.listLifts(), Api.listExercises()]);
    if (!logs.length) {
      ctx.parentElement.innerHTML = `<div class="card-title">Volume by muscle group</div><div class="empty-state"><p>Log some sets to see this breakdown.</p></div>`;
      return;
    }

    const exerciseToGroup = Object.fromEntries(exercisesList.map(e => [e.id, e.muscle_group || "other"]));
    const byGroup = {};
    for (const l of logs) {
      const group = exerciseToGroup[l.exercise_id] || "other";
      byGroup[group] = (byGroup[group] || 0) + l.weight_kg * l.reps;
    }
    const entries = Object.entries(byGroup).sort((a, b) => b[1] - a[1]);

    if (muscleVolumeChart) muscleVolumeChart.destroy();
    muscleVolumeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: entries.map(([group]) => capitalize(group)),
        datasets: [{
          data: entries.map(([, volume]) => Math.round(volume)),
          backgroundColor: entries.map(([group]) => MUSCLE_GROUP_COLORS[group] || MUSCLE_GROUP_COLORS.other),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { color: chartColors().grid } },
          y: { ticks: { color: chartColors().tickY, font: { size: 12 } }, grid: { display: false } },
        },
      },
    });
  } catch (err) {
    handleApiError(err);
  }
}

loadInsights();
loadStrengthPercentiles();
loadChangeChart();
loadWeightTrend();
loadVolumeChart();
loadMuscleGroupVolumeChart();