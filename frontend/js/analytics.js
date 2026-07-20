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
  <div id="calendarWrapper" class="mb-16"></div>
  <div id="compareWrapper" class="mb-16"></div>


  <div class="bar-divider" style="margin-top:0;"><div class="collar"></div><div class="rail"></div><div class="label">All insights</div><div class="rail"></div><div class="collar"></div></div>
  <div class="card mb-16"><ul class="insight-list" id="fullInsightList"></ul></div>

  <div class="card mb-16">
    <div class="card-title">Weight trend</div>
    <canvas id="weightTrendCanvas" height="100"></canvas>
  </div>

  <div class="card mb-16">
    <div class="card-title">Weekly training volume <span class="text-tertiary" style="font-weight:400;">(all lifts, kg × reps)</span></div>
    <canvas id="volumeCanvas" height="80"></canvas>
  </div>

  <div class="card mb-16">
    <div class="card-title">Muscle Balance <span class="text-tertiary" style="font-weight:400;">(volume by group)</span></div>
    <div style="position: relative; height: 320px; width: 100%; display: flex; justify-content: center;">
      <canvas id="muscleVolumeCanvas"></canvas>
    </div>
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


async function loadInsights() {
  const container = document.getElementById("fullInsightList").parentElement;
  try {
    const res = await Api.insights();
    if (!res.insights || res.insights.length === 0) {
      container.innerHTML = `<ul class="insight-list"><li class="insight-item"><div>No insights generated yet. Keep logging!</div></li></ul>`;
      return;
    }
    
    let html = "";
    let regularInsights = [];
    
    for (const insight of res.insights) {
      if (typeof insight === 'string') {
        regularInsights.push(insight);
        continue;
      }
      
      if (insight.type === 'percentile') {
        html += `
          <div class="percentile-card">
            <div class="pct-header">
              <span class="pct-title">${escapeHtml(insight.title)} Rank</span>
              <span class="pct-badge">Top ${100 - Math.round(insight.value)}%</span>
            </div>
            <div class="pct-body">
              <div class="pct-circle">
                <span class="pct-num">${Math.round(insight.value)}</span>
                <span class="pct-sym">%</span>
              </div>
              <div class="pct-text">${escapeHtml(insight.text)}</div>
            </div>
            <div class="pct-bar-bg">
              <div class="pct-bar-fill" style="width: ${insight.value}%;"></div>
            </div>
          </div>
        `;
      } else {
        regularInsights.push(`<strong>${escapeHtml(insight.title)}:</strong> ${escapeHtml(insight.text)}`);
      }
    }
    
    if (regularInsights.length > 0) {
      html += `<ul class="insight-list" style="margin-top: 16px;">` + regularInsights.map(line => `
        <li class="insight-item"><div class="insight-dot"></div><div>${line}</div></li>
      `).join("") + `</ul>`;
    }
    
    container.innerHTML = html;
    window.hideLoading && window.hideLoading();
  } catch (err) {
    handleApiError(err);
    window.hideLoading && window.hideLoading();
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
      ctx.parentElement.parentElement.innerHTML = `<div class="card-title">Muscle Balance</div><div class="empty-state"><p>Log some sets to see this breakdown.</p></div>`;
      return;
    }

    const exerciseToGroup = Object.fromEntries(exercisesList.map(e => [e.id, e.muscle_group || "other"]));
    const byGroup = {};
    for (const l of logs) {
      const group = exerciseToGroup[l.exercise_id] || "other";
      byGroup[group] = (byGroup[group] || 0) + l.weight_kg * l.reps;
    }

    // Fixed circular order for a meaningful radar shape
    const radarOrder = [
      "neck", "shoulders", "chest", "biceps", "forearms", "abs", 
      "quads", "calves", "hamstrings", "glutes", "back", "triceps"
    ];

    const labels = [];
    const data = [];
    const pointColors = [];
    
    radarOrder.forEach(group => {
      // Only include groups if they have data OR if they are standard groups
      // This keeps the radar shape consistent, but omits completely unused obscure ones.
      const vol = byGroup[group] || 0;
      labels.push(capitalize(group));
      data.push(Math.round(vol));
      pointColors.push(MUSCLE_GROUP_COLORS[group] || MUSCLE_GROUP_COLORS.other);
    });

    if (muscleVolumeChart) muscleVolumeChart.destroy();
    
    const isDark = !document.documentElement.getAttribute('data-theme') ||
                    document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(242,240,234,0.1)' : 'rgba(0,0,0,0.1)';
    const tickColor = chartColors().tick;

    muscleVolumeChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: labels,
        datasets: [{
          label: "Volume",
          data: data,
          backgroundColor: 'rgba(79, 157, 105, 0.25)',
          borderColor: '#4F9D69',
          borderWidth: 2,
          pointBackgroundColor: pointColors,
          pointBorderColor: isDark ? '#1e2327' : '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw.toLocaleString()} kg×reps` } } },
        scales: {
          r: {
            angleLines: { color: gridColor },
            grid: { color: gridColor },
            pointLabels: { color: tickColor, font: { size: 11, family: 'Inter, sans-serif', weight: '500' } },
            ticks: { display: false, backdropColor: 'transparent' }
          }
        },
      },
    });
  } catch (err) {
    handleApiError(err);
  }
}


let currentCalendarDate = new Date();
let calendarHeatmapData = null;

window.updateCalendarState = function(offsetMonths) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offsetMonths);
  const container = document.getElementById("calendarWrapper");
  if (container && calendarHeatmapData) {
    container.innerHTML = renderCalendar(calendarHeatmapData);
  }
};

function renderCalendar(heatmapData) {
  if (!heatmapData) return "";
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthName = currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
  const nextDisabled = isCurrentMonth ? "disabled" : "";
  
  let html = `<div class="card cal-card">
    <div class="cal-header">
      <button class="cal-nav-btn" onclick="updateCalendarState(-1)">&#10094;</button>
      <div class="cal-title">${monthName}</div>
      <button class="cal-nav-btn" onclick="updateCalendarState(1)" ${nextDisabled}>&#10095;</button>
    </div>
    <div class="cal-grid">
      <div class="cal-day-name">S</div>
      <div class="cal-day-name">M</div>
      <div class="cal-day-name">T</div>
      <div class="cal-day-name">W</div>
      <div class="cal-day-name">T</div>
      <div class="cal-day-name">F</div>
      <div class="cal-day-name">S</div>
  `;
  for (let i = 0; i < firstDay; i++) { html += `<div class="cal-cell empty"></div>`; }
  for (let d = 1; d <= daysInMonth; d++) {
    const loopDate = new Date(year, month, d);
    if (loopDate > today) { html += `<div class="cal-cell empty"></div>`; continue; }
    const yyyy = loopDate.getFullYear();
    const mm = String(loopDate.getMonth() + 1).padStart(2, '0');
    const dd = String(loopDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const sets = heatmapData[dateStr] || 0;
    if (sets > 0) {
      const tooltipText = `${sets} sets on ${monthName.split(' ')[0]} ${d}`;
      html += `<div class="cal-cell cal-cell-active">${d}<span class="cal-tooltip">${tooltipText}</span></div>`;
    } else {
      html += `<div class="cal-cell">${d}</div>`;
    }
  }
  html += `</div></div>`;
  return html;
}

async function loadCalendar() {
  try {
    const dash = await Api.dashboard();
    calendarHeatmapData = dash.heatmap_data;
    const container = document.getElementById("calendarWrapper");
    if (container) {
      container.innerHTML = renderCalendar(calendarHeatmapData);
    }
  } catch (err) {
    console.error("Failed to load calendar", err);
  }
}

async function loadCompare(days = 90) {
  const container = document.getElementById("compareWrapper");
  if (!container) return;
  
  // Render loading state or skeleton
  container.innerHTML = `
    <div class="card">
      <div class="card-title">Compare to past you</div>
      <div class="compare-toggles mb-12">
        <button class="btn ${days === 7 ? 'active' : ''}" onclick="loadCompare(7)">7 Days</button>
        <button class="btn ${days === 30 ? 'active' : ''}" onclick="loadCompare(30)">30 Days</button>
        <button class="btn ${days === 90 ? 'active' : ''}" onclick="loadCompare(90)">90 Days</button>
        <button class="btn ${days === 365 ? 'active' : ''}" onclick="loadCompare(365)">1 Year</button>
      </div>
      <div class="empty-state"><p>Loading comparison...</p></div>
    </div>
  `;
  
  try {
    const res = await Api.compare(days);
    
    if (!res.delta) {
      container.innerHTML = `
        <div class="card">
          <div class="card-title">Compare to past you</div>
          <div class="compare-toggles mb-12">
            <button class="btn ${days === 7 ? 'active' : ''}" onclick="loadCompare(7)">7 Days</button>
            <button class="btn ${days === 30 ? 'active' : ''}" onclick="loadCompare(30)">30 Days</button>
            <button class="btn ${days === 90 ? 'active' : ''}" onclick="loadCompare(90)">90 Days</button>
            <button class="btn ${days === 365 ? 'active' : ''}" onclick="loadCompare(365)">1 Year</button>
          </div>
          <div class="empty-state"><p>Not enough history in the past period to compare. Check back later!</p></div>
        </div>
      `;
      return;
    }
    
    const fmtPct = (val) => {
      if (val === null || val === undefined) return "-";
      return (val > 0 ? "+" : "") + val.toFixed(1) + "%";
    };
    
    const fmtDiff = (val) => {
      if (val === null || val === undefined) return "-";
      return (val > 0 ? "+" : "") + val;
    };
    
    const dVol = res.delta.volume_pct;
    const dPr = res.delta.pr_count_diff;
    const dDays = res.delta.active_days_diff;
    const dSes = res.delta.sessions_per_week_diff;
    
    const getCls = (val) => (val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral');
    
    container.innerHTML = `
      <div class="card">
        <div class="card-title">Compare to past you</div>
        <div class="compare-toggles mb-16">
          <button class="btn ${days === 7 ? 'active' : ''}" onclick="loadCompare(7)">7 Days</button>
          <button class="btn ${days === 30 ? 'active' : ''}" onclick="loadCompare(30)">30 Days</button>
          <button class="btn ${days === 90 ? 'active' : ''}" onclick="loadCompare(90)">90 Days</button>
          <button class="btn ${days === 365 ? 'active' : ''}" onclick="loadCompare(365)">1 Year</button>
        </div>
        
        <!-- Volume -->
        <div class="compare-grid mb-16">
          <div class="compare-col past">
            <div class="compare-label">Past ${days}</div>
            <div class="compare-value">${Math.round(res.past.total_volume_kg).toLocaleString()} kg</div>
          </div>
          <div class="compare-delta ${getCls(dVol)}">
            ${fmtPct(dVol)}
            <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-tertiary);">Volume</div>
          </div>
          <div class="compare-col">
            <div class="compare-label">Last ${days}</div>
            <div class="compare-value">${Math.round(res.current.total_volume_kg).toLocaleString()} kg</div>
          </div>
        </div>
        
        <!-- PRs -->
        <div class="compare-grid mb-16">
          <div class="compare-col past">
            <div class="compare-value">${res.past.pr_count}</div>
          </div>
          <div class="compare-delta ${getCls(dPr)}">
            ${fmtDiff(dPr)}
            <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-tertiary);">PRs Hit</div>
          </div>
          <div class="compare-col">
            <div class="compare-value">${res.current.pr_count}</div>
          </div>
        </div>
        
        <!-- Consistency -->
        <div class="compare-grid">
          <div class="compare-col past">
            <div class="compare-value">${res.past.sessions_per_week} <span style="font-size:0.8rem;font-weight:normal;">/wk</span></div>
          </div>
          <div class="compare-delta ${getCls(dSes)}">
            ${fmtDiff(dSes)}
            <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-tertiary);">Consistency</div>
          </div>
          <div class="compare-col">
            <div class="compare-value">${res.current.sessions_per_week} <span style="font-size:0.8rem;font-weight:normal;">/wk</span></div>
          </div>
        </div>
      </div>
    `;
    
  } catch (err) {
    console.error("Failed to load comparison", err);
  }
}

loadCompare(90);
loadCalendar();
loadInsights();
loadWeightTrend();
loadVolumeChart();
loadMuscleGroupVolumeChart();
