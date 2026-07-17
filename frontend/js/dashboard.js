renderShell("dashboard", "Dashboard", "");

let currentCalendarDate = new Date();
let dashboardData = null;

window.updateCalendarState = function(offsetMonths) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offsetMonths);
  const container = document.getElementById("calendarWrapper");
  if (container && dashboardData) {
    container.innerHTML = renderCalendar(dashboardData.heatmap_data);
  }
};

function renderCalendar(heatmapData) {
  if (!heatmapData) return "";
  
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  const monthName = currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
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
  
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const loopDate = new Date(year, month, d);
    if (loopDate > today) {
      html += `<div class="cal-cell empty"></div>`;
      continue;
    }
    
    const yyyy = loopDate.getFullYear();
    const mm = String(loopDate.getMonth() + 1).padStart(2, '0');
    const dd = String(loopDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const sets = heatmapData[dateStr] || 0;
    
    if (sets > 0) {
      const tooltipText = `${sets} sets on ${monthName.split(' ')[0]} ${d}`;
      html += `<div class="cal-cell cal-cell-active">
        ${d}
        <span class="cal-tooltip">${tooltipText}</span>
      </div>`;
    } else {
      html += `<div class="cal-cell">${d}</div>`;
    }
  }
  
  html += `</div></div>`;
  return html;
}

async function loadDashboard() {
  const content = document.getElementById("pageContent");
  content.innerHTML = `<div class="loading-block"><div class="spinner"></div> Loading your stats…</div>`;

  try {
    const user = Auth.getUser();
    const [dash, weightSummary] = await Promise.all([
      Api.dashboard(),
      Api.weightSummary(),
    ]);
    
    dashboardData = dash;

    const subtitleEl = document.getElementById("pageSubtitle");
    subtitleEl.textContent = `Welcome back, ${dash.username}.`;
    subtitleEl.style.display = "block";

    // ---- weight delta ----
    const weightDelta = fmtDelta(dash.weight_change_last_30d_kg, " kg");

    // ---- goal progress ----
    let goalCardHtml = "";
    if (weightSummary.has_data && weightSummary.goal_weight_kg) {
      const start = weightSummary.starting_weight_kg;
      const current = weightSummary.current_weight_kg;
      const goal = weightSummary.goal_weight_kg;
      let pct = 0;
      if (goal !== start) {
        pct = ((current - start) / (goal - start)) * 100;
        pct = Math.max(0, Math.min(100, pct));
      } else {
        pct = 100;
      }
      const etaText = weightSummary.estimated_days_to_goal
        ? `~${Math.round(weightSummary.estimated_days_to_goal / 7)} weeks left at current pace`
        : "Log consistently to get an ETA";
      goalCardHtml = `
        <div class="card stat-card">
          <div class="stat-label">Goal progress</div>
          <div class="stat-value">${pct.toFixed(0)}<span class="unit">%</span></div>
          <div class="plate-progress mt-8">
            <div class="plate-rack"><div class="plate-rack-fill" style="width:${pct}%"></div></div>
            <div class="pct">${fmtKg(current)}/${fmtKg(goal)}</div>
          </div>
          <div class="stat-delta neutral mt-8">${etaText}</div>
        </div>`;
    } else {
      goalCardHtml = `
        <div class="card stat-card">
          <div class="stat-label">Goal progress</div>
          <div class="stat-value" style="font-size:18px;color:var(--text-tertiary);">No goal set</div>
          <a href="profile.html" class="btn btn-secondary btn-sm mt-8" style="width:fit-content;">Set a goal weight</a>
        </div>`;
    }

      let statsGridHtml = "";
      if (dash.current_weight_kg === null && dash.current_streak_days === 0 && dash.avg_calories_last_7_days === null) {
        statsGridHtml = buildEmptyState(
          "Welcome to IRONLOG", 
          "You haven't logged any data yet. Start by logging your weight, a workout, or your calories below.", 
          "Log your first workout", 
          "workout.html"
        );
      } else {
        statsGridHtml = `
          <div class="grid grid-stats">
            <div class="card stat-card">
              <div class="stat-label">Current weight</div>
              <div class="stat-value">${dash.current_weight_kg !== null ? fmtKg(dash.current_weight_kg) : "—"}<span class="unit">kg</span></div>
              <div class="stat-delta ${weightDelta.cls}">${weightDelta.text} (30d)</div>
            </div>
            ${goalCardHtml}
            <div class="card stat-card">
              <div class="stat-label">Avg calories (7d)</div>
              <div class="stat-value">${dash.avg_calories_last_7_days !== null ? Math.round(dash.avg_calories_last_7_days) : "—"}<span class="unit">kcal</span></div>
              <div class="stat-delta neutral">${dash.total_calorie_entries} days logged total</div>
            </div>
            <div class="card stat-card">
              <div class="stat-label">Logging streak</div>
              <div class="stat-value">${dash.current_streak_days}<span class="unit">days</span></div>
              <div class="stat-delta neutral">Longest streak: ${dash.longest_streak_days} days</div>
            </div>
          </div>
        `;
      }

      const calendarHtml = renderCalendar(dash.heatmap_data);

      content.innerHTML = `
        <div id="calendarWrapper">${calendarHtml}</div>
        ${statsGridHtml}



      <div class="bar-divider"><div class="collar"></div><div class="rail"></div><div class="label">Quick log</div><div class="rail"></div><div class="collar"></div></div>

      <div class="grid grid-stats">
        <a href="weight.html" class="card flex gap-12" style="align-items:center;">
          <div class="brand-mark" style="background:var(--plate-blue);">W</div>
          <div><strong>Log weight</strong><div class="text-tertiary" style="font-size:12.5px;">Daily check-in</div></div>
        </a>
        <a href="lifts.html" class="card flex gap-12" style="align-items:center;">
          <div class="brand-mark" style="background:var(--plate-red);">L</div>
          <div><strong>Log a lift</strong><div class="text-tertiary" style="font-size:12.5px;">Record a set</div></div>
        </a>
        <a href="nutrition.html" class="card flex gap-12" style="align-items:center;">
          <div class="brand-mark" style="background:var(--plate-green);">N</div>
          <div><strong>Log calories</strong><div class="text-tertiary" style="font-size:12.5px;">Track intake</div></div>
        </a>
      </div>
    `;



  } catch (err) {
    handleApiError(err);
    content.innerHTML = `<div class="empty-state"><p>Couldn't load your dashboard. Try refreshing.</p></div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

loadDashboard();
