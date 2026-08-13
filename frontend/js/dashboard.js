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
    subtitleEl.textContent = `Welcome back, ${escapeHtml(dash.username)}.`;
    subtitleEl.style.display = "block";

    // Show wrapped banner if we have logged anything this month
    // Just show it always for now as a fun feature
    const wrapBanner = document.getElementById('wrappedBanner');
    if (wrapBanner) {
        wrapBanner.style.display = 'block';
    }



    let etaHtml = "";
    if (nextEta) {
      const sessionsText = nextEta.sessions_away === 1 ? "1 session" : `${escapeHtml(nextEta.sessions_away)} sessions`;
      etaHtml = `
        <div class="card" style="margin-bottom: 1.5rem; background: var(--bg-secondary); border-left: 4px solid var(--plate-red);">
          <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">At your current rate, you'll ${escapeHtml(nextEta.exercise_name).toLowerCase()} ${escapeHtml(nextEta.target_kg)}kg in ${escapeHtml(sessionsText)}</div>
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
        ? `~${escapeHtml(Math.round(weightSummary.estimated_days_to_goal / 7))} weeks left at current pace`
        : "Log consistently to get an ETA";
      goalCardHtml = `
        <div class="card stat-card">
          <div class="stat-label">Goal progress</div>
          <div class="stat-value">${escapeHtml(pct.toFixed(0))}<span class="unit">%</span></div>
          <div class="plate-progress mt-8">
            <div class="plate-rack"><div class="plate-rack-fill" style="width:${escapeHtml(pct)}%"></div></div>
            <div class="pct">${escapeHtml(fmtKg(current))}/${escapeHtml(fmtKg(goal))}</div>
          </div>
          <div class="stat-delta neutral mt-8">${escapeHtml(etaText)}</div>
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
        content.innerHTML = DOMPurify.sanitize(`
          <div class="empty-state" style="padding: 4rem 1.5rem; text-align: center; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1); margin-top: 2rem;">
            <div style="background:var(--bg-tertiary); width:64px; height:64px; border-radius:32px; display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;color:var(--plate-blue);">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--text-primary); font-weight: 700;">Welcome to IRONLOG</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 320px; margin-left: auto; margin-right: auto; line-height: 1.6;">You haven't logged any data yet. Start tracking your strength and consistency today.</p>
            <a href="workout.html" class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; width: 100%; max-width: 250px; font-weight: bold; margin-bottom: 1rem; padding: 12px;">Log your first workout</a>
            <div>
              <a href="weight.html" style="color: var(--text-secondary); font-size: 0.95rem; text-decoration: underline;">Or log your body weight</a>
            </div>
          </div>
        `);
        window.hideLoading && window.hideLoading();
        return;
      } else {
        statsGridHtml = `
          <div class="grid grid-stats">
            <div class="card stat-card">
              <div class="stat-label">Current weight</div>
              <div class="stat-value">${escapeHtml(dash.current_weight_kg !== null ? fmtKg(dash.current_weight_kg) : "—")}<span class="unit">kg</span></div>
              <div class="stat-delta ${escapeHtml(weightDelta.cls)}">${escapeHtml(weightDelta.text)} (30d)</div>
            </div>
            ${goalCardHtml}
            <div class="card stat-card">
              <div class="stat-label">Avg calories (7d)</div>
              <div class="stat-value">${escapeHtml(dash.avg_calories_last_7_days !== null ? Math.round(dash.avg_calories_last_7_days) : "—")}<span class="unit">kcal</span></div>
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

      

      content.innerHTML = DOMPurify.sanitize(`
        
        ${etaHtml}
        <div id="wrappedBanner" style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; color: white; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4); display: flex; justify-content: space-between; align-items: center; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.6)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.4)';" onclick="window.DashboardPage.showWrapped()">
          <div style="position: relative; z-index: 2;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.25rem;">
              <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; letter-spacing: -0.3px;">Your Month in IronLog</h2>
            </div>
            <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Tap to review your progress and milestones.</p>
          </div>
          <div style="opacity: 0.5; display: flex; align-items: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
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
    `);



    window.hideLoading && window.hideLoading();
  } catch (err) {
    handleApiError(err);
    content.innerHTML = DOMPurify.sanitize(`<div class="empty-state"><p>Couldn't load your dashboard. Try refreshing.</p></div>`);
    window.hideLoading && window.hideLoading();
  }
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
