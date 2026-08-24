renderShell("analytics", "Analytics", "The full picture, pulled together.");

let changeChart = null, volumeChart = null, weightTrendChart = null, muscleVolumeChart = null;


// One color per muscle group keeps the bars visually distinguishable rather
// than all-one-color, without needing a full design pass per group.
const MUSCLE_GROUP_COLORS = {
  chest: "#E2402D", back: "#3E7CB1", shoulders: "#D4A33B", biceps: "#4F9D69",
  triceps: "#8B6BB7", legs: "#C9CCD1", quads: "#5FA8D3", hamstrings: "#E08A6B",
  glutes: "#D46BA3", calves: "#7BAE7F", abs: "#B0A458", other: "#6B7480",
};

async function initAnalytics() {
  document.getElementById("pageContent").innerHTML = DOMPurify.sanitize(`
    <div id="calendarWrapper" class="mb-16"></div>
    <div id="compareWrapper" class="mb-16"></div>




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
  `);

  document.getElementById("compareWrapper").addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" && e.target.hasAttribute("data-days")) {
      const days = parseInt(e.target.getAttribute("data-days"), 10);
      loadCompare(days);
    }
  });
const TIER_BADGE = {
  beginner: "badge-grey", novice: "badge-blue", intermediate: "badge-green",
  advanced: "badge-gold", elite: "badge-red",
};


async function loadWeightTrend() {
  const ctx = document.getElementById("weightTrendCanvas");
  try {
    const summary = await Api.weightSummary();
    if (!summary.has_data) {
      ctx.parentElement.innerHTML = DOMPurify.sanitize(`<div class="card-title">Weight trend</div><div class="empty-state"><p>No weight logs yet.</p></div>`);
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
      ctx.parentElement.parentElement.innerHTML = DOMPurify.sanitize(`<div class="card-title">Muscle Balance</div><div class="empty-state"><p>Log some sets to see this breakdown.</p></div>`);
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
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${escapeHtml(ctx.raw.toLocaleString())} kg×reps` } } },
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
    container.innerHTML = DOMPurify.sanitize(renderCalendar(calendarHeatmapData));
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
      <div class="cal-title">${escapeHtml(monthName)}</div>
      <button class="cal-nav-btn" onclick="updateCalendarState(1)" ${escapeHtml(nextDisabled)}>&#10095;</button>
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
    const dateStr = `${escapeHtml(yyyy)}-${escapeHtml(mm)}-${escapeHtml(dd)}`;
    const sets = heatmapData[dateStr] || 0;
    if (sets > 0) {
      const tooltipText = `${escapeHtml(sets)} sets on ${escapeHtml(monthName.split(' ')[0])} ${escapeHtml(d)}`;
      html += `<div class="cal-cell cal-cell-active">${escapeHtml(d)}<span class="cal-tooltip">${escapeHtml(tooltipText)}</span></div>`;
    } else {
      html += `<div class="cal-cell">${escapeHtml(d)}</div>`;
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
      container.innerHTML = DOMPurify.sanitize(renderCalendar(calendarHeatmapData));
    }
  } catch (err) {
    console.error("Failed to load calendar", err);
  }
}

async function loadCompare(days = 90) {
  const container = document.getElementById("compareWrapper");
  if (!container) return;
  
  // Render loading state or skeleton
  container.innerHTML = DOMPurify.sanitize(`
    <div class="card">
      <div class="card-title">Compare to past you</div>
      <div class="compare-toggles mb-12">
        <button class="btn ${escapeHtml(days === 7 ? 'active' : '')}" data-days="7">7 Days</button>
        <button class="btn ${escapeHtml(days === 30 ? 'active' : '')}" data-days="30">30 Days</button>
        <button class="btn ${escapeHtml(days === 90 ? 'active' : '')}" data-days="90">90 Days</button>
        <button class="btn ${escapeHtml(days === 365 ? 'active' : '')}" data-days="365">1 Year</button>
      </div>
      <div class="empty-state"><p>Loading comparison...</p></div>
    </div>
  `);
  
  try {
    const res = await Api.compare(days);
    
    if (!res.delta) {
      container.innerHTML = DOMPurify.sanitize(`
        <div class="card">
          <div class="card-title">Compare to past you</div>
          <div class="compare-toggles mb-12">
            <button class="btn ${escapeHtml(days === 7 ? 'active' : '')}" data-days="7">7 Days</button>
            <button class="btn ${escapeHtml(days === 30 ? 'active' : '')}" data-days="30">30 Days</button>
            <button class="btn ${escapeHtml(days === 90 ? 'active' : '')}" data-days="90">90 Days</button>
            <button class="btn ${escapeHtml(days === 365 ? 'active' : '')}" data-days="365">1 Year</button>
          </div>
          <div class="empty-state"><p>Not enough history in the past period to compare. Check back later!</p></div>
        </div>
      `);
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
    
    container.innerHTML = DOMPurify.sanitize(`
      <div class="card">
        <div class="card-title">Compare to past you</div>
        <div class="compare-toggles mb-16">
          <button class="btn ${escapeHtml(days === 7 ? 'active' : '')}" data-days="7">7 Days</button>
          <button class="btn ${escapeHtml(days === 30 ? 'active' : '')}" data-days="30">30 Days</button>
          <button class="btn ${escapeHtml(days === 90 ? 'active' : '')}" data-days="90">90 Days</button>
          <button class="btn ${escapeHtml(days === 365 ? 'active' : '')}" data-days="365">1 Year</button>
        </div>
        
        <!-- Volume -->
        <div class="compare-grid mb-16">
          <div class="compare-col past">
            <div class="compare-label">Past ${escapeHtml(days)}</div>
            <div class="compare-value">${escapeHtml(Math.round(res.past.total_volume_kg).toLocaleString())} kg</div>
          </div>
          <div class="compare-delta ${escapeHtml(getCls(dVol))}">
            ${escapeHtml(fmtPct(dVol))}
            <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-tertiary);">Volume</div>
          </div>
          <div class="compare-col">
            <div class="compare-label">Last ${escapeHtml(days)}</div>
            <div class="compare-value">${escapeHtml(Math.round(res.current.total_volume_kg).toLocaleString())} kg</div>
          </div>
        </div>
        
        <!-- PRs -->
        <div class="compare-grid mb-16">
          <div class="compare-col past">
            <div class="compare-value">${escapeHtml(res.past.pr_count)}</div>
          </div>
          <div class="compare-delta ${escapeHtml(getCls(dPr))}">
            ${escapeHtml(fmtDiff(dPr))}
            <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-tertiary);">PRs Hit</div>
          </div>
          <div class="compare-col">
            <div class="compare-value">${escapeHtml(res.current.pr_count)}</div>
          </div>
        </div>
        
        <!-- Consistency -->
        <div class="compare-grid">
          <div class="compare-col past">
            <div class="compare-value">${escapeHtml(res.past.sessions_per_week)} <span style="font-size:0.8rem;font-weight:normal;">/wk</span></div>
          </div>
          <div class="compare-delta ${escapeHtml(getCls(dSes))}">
            ${escapeHtml(fmtDiff(dSes))}
            <div style="font-size: 0.75rem; font-weight: normal; color: var(--text-tertiary);">Consistency</div>
          </div>
          <div class="compare-col">
            <div class="compare-value">${escapeHtml(res.current.sessions_per_week)} <span style="font-size:0.8rem;font-weight:normal;">/wk</span></div>
          </div>
        </div>
      </div>
    `);
    
  } catch (err) {
    console.error("Failed to load comparison", err);
  }
}

  await Promise.all([
    loadCompare(90),
    loadCalendar(),
    loadWeightTrend(),
    loadVolumeChart(),
    loadMuscleGroupVolumeChart()
  ]);
  window.hideLoading && window.hideLoading();
}

initAnalytics();
