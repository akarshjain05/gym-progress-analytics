// coach.js — IRONLOG AI Coach Page
// Hybrid ML + Gemini AI (falls back to rule-based if no API key)

(function () {
  renderShell("coach", "AI Coach", "ML predictions + personalised advice");

  const content = document.getElementById("pageContent");

  content.innerHTML = `
    <div id="coachPage">

      <!-- Phase banner -->
      <div id="phaseBanner" class="phase-banner" style="display:none;"></div>

      <!-- AI Advice Card -->
      <div class="coach-card coach-advice-card">
        <div class="coach-card-header">
          <div class="coach-icon">🤖</div>
          <div class="coach-header-text">
            <div class="coach-card-title">Your Personal AI Coach</div>
            <div class="coach-card-sub" id="adviceSubtitle">Analysing your training data…</div>
          </div>
          <button class="btn btn-primary coach-btn" id="getAdviceBtn" disabled>Loading…</button>
        </div>
        <div id="adviceOutput" class="advice-output" style="display:none;">
          <div id="adviceText" class="advice-text"></div>
        </div>
      </div>

      <!-- Loading -->
      <div id="mlLoading" class="coach-loading">
        <div class="ironlog-spinner"></div>
        <span>Running ML models on your data…</span>
      </div>

      <!-- No data -->
      <div id="noDataMsg" style="display:none;" class="coach-card coach-empty">
        <div style="font-size:2.5rem;">🏋️</div>
        <h3>Start logging to unlock AI coaching</h3>
        <p>Log at least one workout session to see predictions. The more you log, the more accurate they become.</p>
      </div>

      <!-- Main ML grid -->
      <div id="mlGrid" style="display:none;">

        <!-- Consistency Score -->
        <div class="coach-card" id="consistencyCard">
          <div class="coach-card-title">Consistency Score</div>
          <div class="consistency-wrap">
            <svg class="consistency-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1e2327" stroke-width="12"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="#c0392b" stroke-width="12"
                stroke-dasharray="314" stroke-dashoffset="314"
                stroke-linecap="round" transform="rotate(-90 60 60)" id="consistencyArc"/>
            </svg>
            <div class="consistency-score-overlay">
              <span id="consistencyScore">0</span>
              <small>/100</small>
            </div>
          </div>
          <div id="consistencyStats" class="consistency-stats"></div>
        </div>

        <!-- Weight Forecast -->
        <div class="coach-card" id="weightCard">
          <div class="coach-card-title">Body Weight Forecast</div>
          <div id="weightPhaseTag" class="phase-tag"></div>
          <div id="weightTrendRow" class="trend-row"></div>
          <div class="pred-grid" id="weightPredGrid"></div>
          <div class="coach-note" id="weightNote"></div>
        </div>

        <!-- Strength Forecast — full width -->
        <div class="coach-card coach-full" id="strengthCard" style="display:none;">
          <div class="coach-card-title">Strength Forecast</div>
          <div class="coach-card-sub">Predicted est. 1RM · personal regression when you have 3+ sessions per exercise</div>
          <div id="strengthList"></div>
        </div>

        <!-- Muscle Volume — full width -->
        <div class="coach-card coach-full" id="volumeCard" style="display:none;">
          <div class="coach-card-title">Muscle Group Volume</div>
          <div class="coach-card-sub">Last 4 weeks vs previous 4 weeks</div>
          <div id="volumeList"></div>
        </div>

        <!-- Nutrition -->
        <div class="coach-card" id="nutritionCard" style="display:none;">
          <div class="coach-card-title">Nutrition & Performance</div>
          <div id="nutritionContent"></div>
        </div>

      </div>
    </div>
  `;

  // ── Load ML analysis ──────────────────────────────────────────────────────
  Api.request("GET", "/coach/analysis")
    .then(data => {
      document.getElementById("mlLoading").style.display = "none";

      if (!data.has_enough_data) {
        document.getElementById("noDataMsg").style.display = "flex";
        enableAdviceBtn(data);
        window.hideLoading && window.hideLoading();
        return;
      }

      // Phase banner
      const banner = document.getElementById("phaseBanner");
      banner.style.display = "flex";
      if (data.data_phase === 1) {
        banner.className = "phase-banner phase-1";
        banner.innerHTML = `
          <span class="phase-icon">🌱</span>
          <div>
            <strong>Getting started — Population Baseline Mode</strong>
            <span>Predictions use fitness science averages. Log for 14+ days to switch to your personal model.</span>
          </div>
          <div class="phase-progress">
            <div class="phase-progress-bar" style="width:${Math.min(100, (data.days_of_data/14)*100)}%"></div>
          </div>
        `;
      } else {
        banner.className = "phase-banner phase-2";
        banner.innerHTML = `
          <span class="phase-icon">🎯</span>
          <div>
            <strong>Personal Model Active — ${data.days_of_data} days of your data</strong>
            <span>Predictions are based on YOUR actual training history.</span>
          </div>
        `;
      }

      document.getElementById("mlGrid").style.display = "grid";
      renderConsistency(data.consistency);
      renderWeightForecast(data.weight_prediction, data.profile);
      if (data.strength_predictions?.length) renderStrength(data.strength_predictions);
      if (data.muscle_group_volume && Object.keys(data.muscle_group_volume).length) renderVolume(data.muscle_group_volume);
      if (data.nutrition_correlation) renderNutrition(data.nutrition_correlation);

      enableAdviceBtn(data);
      window.hideLoading && window.hideLoading();
    })
    .catch(() => {
      document.getElementById("mlLoading").style.display = "none";
      document.getElementById("noDataMsg").style.display = "flex";
      window.hideLoading && window.hideLoading();
    });

  function enableAdviceBtn(data) {
    const btn = document.getElementById("getAdviceBtn");
    const sub = document.getElementById("adviceSubtitle");
    btn.disabled = false;
    btn.textContent = "Get AI Advice";
    sub.textContent = data.data_phase === 2
      ? "Powered by Gemini AI + your personal training data"
      : "Powered by Gemini AI + fitness science baselines";
  }

  // ── AI Advice streaming ───────────────────────────────────────────────────
  document.getElementById("getAdviceBtn").addEventListener("click", () => {
    const btn = document.getElementById("getAdviceBtn");
    const output = document.getElementById("adviceOutput");
    const textEl = document.getElementById("adviceText");

    btn.disabled = true;
    btn.textContent = "Thinking…";
    output.style.display = "block";
    textEl.innerHTML = '<span class="advice-cursor">▍</span>';
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const token = Auth.getToken();
    const baseUrl = window.IRONLOG_API_BASE;

    fetch(`${baseUrl}/coach/advice`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(async res => {
      if (!res.ok || !res.body) {
        textEl.innerHTML = '<span style="color:#e05a4a">Could not connect to AI coach. Please try again.</span>';
        btn.disabled = false;
        btn.textContent = "Try Again";
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      textEl.innerHTML = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            if (evt.text) {
              fullText += evt.text;
              textEl.innerHTML = renderMarkdown(fullText) + '<span class="advice-cursor">▍</span>';
            }
          } catch {}
        }
      }

      textEl.innerHTML = renderMarkdown(fullText);
      btn.disabled = false;
      btn.textContent = "Refresh Advice";

    }).catch(() => {
      textEl.innerHTML = '<span style="color:#e05a4a">Connection error. Please try again.</span>';
      btn.disabled = false;
      btn.textContent = "Try Again";
    });
  });

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // ── Render: Consistency ───────────────────────────────────────────────────
  function renderConsistency(c) {
    const score = c.overall_score;
    const arc = document.getElementById("consistencyArc");
    const offset = 314 - (score / 100) * 314;
    arc.style.transition = "stroke-dashoffset 1.2s ease, stroke 0.5s";
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = score >= 75 ? "#27ae60" : score >= 50 ? "#f39c12" : "#c0392b";
    document.getElementById("consistencyScore").textContent = Math.round(score);

    const flags = [];
    if (c.overtraining_flag) flags.push('<span class="cflag red">⚠ Overtraining risk</span>');
    if (c.workout_frequency_per_week < 2) flags.push('<span class="cflag yellow">⚡ Low frequency</span>');
    if (c.workout_frequency_per_week >= 3 && c.workout_frequency_per_week <= 5) flags.push('<span class="cflag green">✓ Good frequency</span>');
    if (c.weight_logging_pct >= 70) flags.push('<span class="cflag green">✓ Weight logging</span>');
    if (c.calorie_logging_pct >= 70) flags.push('<span class="cflag green">✓ Calorie logging</span>');

    document.getElementById("consistencyStats").innerHTML = `
      <div class="srow"><span>Sessions / week</span><strong>${c.workout_frequency_per_week}</strong></div>
      <div class="srow"><span>Sessions (28d)</span><strong>${c.lift_days_last_28}</strong></div>
      <div class="srow"><span>Weight logged</span><strong>${c.weight_logging_pct}%</strong></div>
      <div class="srow"><span>Calories logged</span><strong>${c.calorie_logging_pct}%</strong></div>
      ${flags.length ? '<div class="cflags">' + flags.join('') + '</div>' : ''}
    `;
  }

  // ── Render: Weight Forecast ───────────────────────────────────────────────
  function renderWeightForecast(wp, profile) {
    if (!wp) return;
    const trendColors = { gaining: "#e67e22", losing: "#27ae60", stable: "#a09880" };
    const color = trendColors[wp.trend] || "#a09880";

    document.getElementById("weightPhaseTag").innerHTML =
      `<span class="phase-tag-pill ${wp.phase === 2 ? 'p2' : 'p1'}">${wp.phase === 2 ? '🎯 Personal model' : '🌱 Baseline estimate'}</span>`;

    document.getElementById("weightTrendRow").innerHTML =
      `<span style="color:${color};font-weight:700;font-size:15px;">${wp.trend.toUpperCase()}</span>
       <span style="color:#a09880;font-size:13px;margin-left:8px;">${Math.abs(wp.weekly_rate_kg)} kg/week</span>`;

    const p = wp.predictions_kg;
    document.getElementById("weightPredGrid").innerHTML = `
      <div class="pred-box"><div class="pred-val">${p["30_days"]} kg</div><div class="pred-lbl">30 days</div></div>
      <div class="pred-box"><div class="pred-val">${p["60_days"]} kg</div><div class="pred-lbl">60 days</div></div>
      <div class="pred-box"><div class="pred-val">${p["90_days"]} kg</div><div class="pred-lbl">90 days</div></div>
    `;

    const goal = profile?.goal_weight_kg;
    let note = wp.r_squared !== null
      ? `Model confidence: ${wp.r_squared >= 0.7 ? "High" : wp.r_squared >= 0.4 ? "Medium" : "Low"} (R²=${wp.r_squared})`
      : wp.phase_label;
    if (goal && wp.weekly_rate_kg !== 0) {
      const weeks = Math.abs((goal - wp.current_weight_kg) / (wp.weekly_rate_kg || 0.001));
      if (isFinite(weeks) && weeks < 500) {
        note += ` · Goal of ${goal}kg in ~${Math.round(weeks)} weeks at current rate`;
      }
    }
    document.getElementById("weightNote").textContent = note;
  }

  // ── Render: Strength ──────────────────────────────────────────────────────
  function renderStrength(preds) {
    document.getElementById("strengthCard").style.display = "block";
    const icons = { improving: "📈", plateau: "➡️", declining: "📉" };
    const colors = { improving: "#27ae60", plateau: "#f39c12", declining: "#c0392b" };

    const html = preds.slice(0, 7).map(s => `
      <div class="strength-row">
        <div class="strength-top">
          <span class="strength-name">${icons[s.trend] || "➡️"} <strong>${s.exercise_name}</strong></span>
          <span class="strength-badge ${s.trend}">${s.trend}</span>
          <span class="phase-pill ${s.phase === 2 ? 'p2' : 'p1'}">${s.phase === 2 ? 'Personal' : 'Baseline'}</span>
        </div>
        <div class="strength-now">Current est. 1RM: <strong>${s.current_1rm_kg} kg</strong>
          ${s.weekly_gain_kg !== 0 ? `<span style="color:${s.weekly_gain_kg > 0 ? '#27ae60' : '#c0392b'};font-size:12px;margin-left:6px;">${s.weekly_gain_kg > 0 ? '+' : ''}${s.weekly_gain_kg} kg/wk</span>` : ''}</div>
        <div class="pred-grid-3">
          <div class="pred-box sm"><div class="pred-val">${s.predictions_kg["4_weeks"]} kg</div><div class="pred-lbl">4 weeks</div></div>
          <div class="pred-box sm"><div class="pred-val">${s.predictions_kg["8_weeks"]} kg</div><div class="pred-lbl">8 weeks</div></div>
          <div class="pred-box sm"><div class="pred-val">${s.predictions_kg["12_weeks"]} kg</div><div class="pred-lbl">12 weeks</div></div>
        </div>
        <div class="strength-meta">${s.sessions_count} sessions logged${s.r_squared !== null ? ` · R²=${s.r_squared}` : ''}</div>
      </div>
    `).join('');
    document.getElementById("strengthList").innerHTML = html;
  }

  // ── Render: Volume ────────────────────────────────────────────────────────
  function renderVolume(vol) {
    document.getElementById("volumeCard").style.display = "block";
    const entries = Object.entries(vol).sort((a, b) => b[1].recent_4w_volume - a[1].recent_4w_volume);
    const maxV = Math.max(...entries.map(([, d]) => d.recent_4w_volume), 1);
    const barColors = { increasing: "#27ae60", decreasing: "#c0392b", stable: "#c9a84c" };

    const html = entries.map(([group, d]) => `
      <div class="vol-row">
        <div class="vol-top">
          <span class="vol-name">${group}</span>
          <span class="vol-change" style="color:${barColors[d.trend] || '#c9a84c'}">${d.change_pct > 0 ? '+' : ''}${d.change_pct}% ${d.trend}</span>
        </div>
        <div class="vol-bar-bg">
          <div class="vol-bar" style="width:${(d.recent_4w_volume/maxV*100).toFixed(1)}%;background:${barColors[d.trend] || '#c9a84c'}"></div>
        </div>
        <div class="vol-nums">${Math.round(d.recent_4w_volume).toLocaleString()} kg <span class="vol-prev">vs ${Math.round(d.prev_4w_volume).toLocaleString()} kg prev</span></div>
      </div>
    `).join('');
    document.getElementById("volumeList").innerHTML = html;
  }

  // ── Render: Nutrition ─────────────────────────────────────────────────────
  function renderNutrition(nc) {
    document.getElementById("nutritionCard").style.display = "block";
    const r2color = nc.correlation_r2 >= 0.5 ? "#27ae60" : nc.correlation_r2 >= 0.2 ? "#f39c12" : "#a09880";
    document.getElementById("nutritionContent").innerHTML = `
      <div class="srow"><span>Avg daily calories</span><strong>${nc.avg_weekly_calories.toLocaleString()} kcal</strong></div>
      <div class="srow"><span>Weeks analysed</span><strong>${nc.weeks_analysed}</strong></div>
      <div class="srow"><span>Correlation (R²)</span><strong style="color:${r2color}">${nc.correlation_r2}</strong></div>
      <div class="coach-note" style="margin-top:12px">${nc.insight}</div>
    `;
  }

})();
