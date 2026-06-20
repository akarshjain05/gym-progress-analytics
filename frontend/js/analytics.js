renderShell("analytics", "Analytics", "The full picture, pulled together.");

let changeChart = null, volumeChart = null, weightTrendChart = null;

document.getElementById("pageContent").innerHTML = `
  <div class="bar-divider" style="margin-top:0;"><div class="collar"></div><div class="rail"></div><div class="label">All insights</div><div class="rail"></div><div class="collar"></div></div>
  <div class="card mb-16"><ul class="insight-list" id="fullInsightList"></ul></div>

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

  <div class="card">
    <div class="card-title">Weekly training volume <span class="text-tertiary" style="font-weight:400;">(all lifts, kg × reps)</span></div>
    <canvas id="volumeCanvas" height="80"></canvas>
  </div>
`;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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
    const prs = await Api.personalRecords();
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
          x: { ticks: { color: "#6B7480", font: { size: 11 }, callback: (v) => v + "%" }, grid: { color: "rgba(242,240,234,0.05)" } },
          y: { ticks: { color: "#9CA5AC", font: { size: 12 } }, grid: { display: false } },
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
          x: { ticks: { color: "#6B7480", font: { size: 11 } }, grid: { color: "rgba(242,240,234,0.05)" } },
          y: { ticks: { color: "#6B7480", font: { size: 11 } }, grid: { color: "rgba(242,240,234,0.05)" } },
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
          x: { ticks: { color: "#6B7480", font: { size: 11 } }, grid: { display: false } },
          y: { ticks: { color: "#6B7480", font: { size: 11 } }, grid: { color: "rgba(242,240,234,0.05)" } },
        },
      },
    });
  } catch (err) {
    handleApiError(err);
  }
}

loadInsights();
loadChangeChart();
loadWeightTrend();
loadVolumeChart();
