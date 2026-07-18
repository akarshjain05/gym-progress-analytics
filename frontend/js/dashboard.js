renderShell("dashboard", "Dashboard", "");



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

      

      content.innerHTML = `
        
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
