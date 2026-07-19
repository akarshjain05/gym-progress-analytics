renderShell("dashboard", "Dashboard", "");



async function loadDashboard() {
  const content = document.getElementById("pageContent");
  // Skeleton handles the loading state

  try {
    const user = Auth.getUser();
    const [dash, weightSummary, nextEta] = await Promise.all([
      Api.dashboard(),
      Api.weightSummary(),
      Api.nextEta(),
    ]);
    
    dashboardData = dash;

    const subtitleEl = document.getElementById("pageSubtitle");
    subtitleEl.textContent = `Welcome back, ${dash.username}.`;
    subtitleEl.style.display = "block";

    // Show wrapped banner if we have logged anything this month
    // Just show it always for now as a fun feature
    const wrapBanner = document.getElementById('wrappedBanner');
    if (wrapBanner) {
        wrapBanner.style.display = 'block';
    }



    let etaHtml = "";
    if (nextEta) {
      const dateStr = new Date(nextEta.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      etaHtml = `
        <div class="card" style="margin-bottom: 1.5rem; background: var(--bg-secondary); border-left: 4px solid var(--plate-red);">
          <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">At your current rate, you'll ${nextEta.exercise_name.toLowerCase()} ${nextEta.target_kg}kg by ${dateStr}</div>
          <div style="font-size: 0.9rem; color: var(--text-tertiary);">${nextEta.days_away} days away</div>
        </div>
      `;
    }

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
        
        ${etaHtml}
        <div id="wrappedBanner" style="background: linear-gradient(135deg, #FF0055, #0000FF); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; color: white; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(255, 0, 85, 0.3);" onclick="window.DashboardPage.showWrapped()">
          <div style="position: relative; z-index: 2;">
            <h2 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px;">Your Month in IronLog</h2>
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">Tap to reveal your absurd stats.</p>
          </div>
          <div style="position: absolute; right: -20px; bottom: -20px; font-size: 100px; opacity: 0.2; transform: rotate(-15deg); line-height: 1;"></div>
        </div>

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



    window.hideLoading && window.hideLoading();
  } catch (err) {
    handleApiError(err);
    content.innerHTML = `<div class="empty-state"><p>Couldn't load your dashboard. Try refreshing.</p></div>`;
    window.hideLoading && window.hideLoading();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

loadDashboard();

window.DashboardPage = window.DashboardPage || {};

window.DashboardPage.showWrapped = async function() {
  document.getElementById('wrappedModal').style.display = 'flex';
  document.getElementById('wrappedLoading').style.display = 'block';
  document.getElementById('wrappedContent').style.display = 'none';

  try {
    const data = await apiRequest("/analytics/wrapped");
    
    document.getElementById('wrapPeriod').textContent = data.period;
    document.getElementById('wrapVol').textContent = Math.round(data.total_volume_kg).toLocaleString();
    document.getElementById('wrapElephants').textContent = data.elephants;
    document.getElementById('wrapMuscle').textContent = data.most_trained_muscle;
    document.getElementById('wrapPrWeight').textContent = data.biggest_pr_weight;
    document.getElementById('wrapPrExercise').textContent = data.biggest_pr_exercise;
    document.getElementById('wrapStreak').textContent = data.longest_streak;
    document.getElementById('wrapActive').textContent = data.active_days;
    
    document.getElementById('wrappedLoading').style.display = 'none';
    document.getElementById('wrappedContent').style.display = 'block';
  } catch(e) {
    console.error(e);
    document.getElementById('wrappedModal').style.display = 'none';
    window.appAlert("Error", "Could not load your Month in IronLog right now.");
  }
};
