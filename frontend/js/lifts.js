// lifts.js — IRONLOG Lifts Page
// Features:
// - Sessions grouped by date, collapsible
// - Personal Records grouped by muscle group
// - Strength level with visual breakpoint scale for ALL exercises

(function () {
  renderShell("lifts", "Lifts", "Estimated 1RM, PRs, and strength trend per exercise.");

  const pageHeaderActions = document.getElementById("pageHeaderActions");
  pageHeaderActions.innerHTML = `<button class="btn btn-primary" id="logSessionBtn">+ Log a session</button>`;

  const content = document.getElementById("pageContent");
  content.innerHTML = `
    <div id="liftsPage">

      <!-- Exercise selector -->
      <div class="lifts-top-row">
        <div class="field" style="margin:0;flex:1;max-width:340px;">
          <label class="field-label">Viewing exercise</label>
          <select id="exerciseSelect" class="select-input"></select>
        </div>
        <button class="btn btn-secondary" id="addCustomBtn">+ Custom exercise</button>
      </div>

      <!-- Progress section -->
      <div id="progressSection" style="display:none;">

        <!-- Stats row -->
        <div class="lifts-stats-row">
          <div class="stat-card">
            <div class="stat-label">LATEST EST. 1RM</div>
            <div class="stat-big"><span id="latest1rm">—</span> <span class="stat-unit">kg</span></div>
            <div class="stat-sub" id="changePct"></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">PERSONAL RECORD</div>
            <div class="stat-big"><span id="pr1rm">—</span> <span class="stat-unit">kg</span></div>
            <div class="stat-sub" id="prDate"></div>
          </div>
          <div class="stat-card" id="strengthCard">
            <div class="stat-label">STRENGTH LEVEL</div>
            <div id="strengthLevelDisplay"></div>
          </div>
        </div>

        <!-- Strength scale (visual breakpoints) -->
        <div id="strengthScaleWrap" style="display:none;" class="strength-scale-card">
          <div class="strength-scale-title">Where you stand vs population</div>
          <div id="strengthScale" class="strength-scale"></div>
          <div id="strengthScaleLabels" class="strength-scale-labels"></div>
        </div>

        <!-- Chart -->
        <div class="chart-card">
          <div class="chart-header">
            <span id="chartTitle" class="chart-title"></span>
            <span id="muscleGroupTag" class="muscle-tag"></span>
          </div>
          <div class="chart-wrap">
            <canvas id="liftChart"></canvas>
          </div>
        </div>

        <!-- Sessions grouped by date -->
        <div class="section-block">
          <div class="section-label">SESSIONS</div>
          <div id="sessionsList"></div>
        </div>

      </div>

      <!-- No data -->
      <div id="noDataMsg" style="display:none;" class="empty-state">
        <div class="empty-icon">🏋️</div>
        <p>No sessions logged for this exercise yet.</p>
        <button class="btn btn-primary" id="logFirstBtn">Log your first session</button>
      </div>

      <!-- Personal Records section -->
      <div class="section-block" id="prSection" style="display:none;">
        <div class="section-label">ALL-TIME PERSONAL RECORDS</div>
        <div id="prGroupedList"></div>
      </div>

    </div>

    <!-- Log Session Modal -->
    <div id="logModal" class="modal-overlay" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">Log a session</span>
          <button class="modal-close" id="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label">Exercise</label>
            <select id="modalExercise" class="select-input"></select>
          </div>
          <div class="field">
            <label class="field-label">Date</label>
            <input type="date" id="modalDate" class="text-input">
          </div>
          <div id="setsContainer"></div>
          <button class="btn btn-secondary btn-block" id="addSetBtn" style="margin-top:8px;">+ Add set</button>
          <div class="field" style="margin-top:12px;">
            <label class="field-label">Notes (optional)</label>
            <input type="text" id="modalNotes" class="text-input" placeholder="e.g. felt strong today">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelModal">Cancel</button>
          <button class="btn btn-primary" id="submitSession">Save session</button>
        </div>
      </div>
    </div>

    <!-- Custom Exercise Modal -->
    <div id="customModal" class="modal-overlay" style="display:none;">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">Add custom exercise</span>
          <button class="modal-close" id="closeCustomModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label">Exercise name</label>
            <input type="text" id="customName" class="text-input" placeholder="e.g. Cable Lateral Raise" maxlength="80">
          </div>
          <div class="field">
            <label class="field-label">Muscle group (optional)</label>
            <select id="customMuscle" class="select-input">
              <option value="">Select…</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="shoulders">Shoulders</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="legs">Legs</option>
              <option value="quads">Quads</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="glutes">Glutes</option>
              <option value="core">Core</option>
              <option value="calves">Calves</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Category (optional)</label>
            <select id="customCategory" class="select-input">
              <option value="">Select…</option>
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
              <option value="core">Core</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelCustom">Cancel</button>
          <button class="btn btn-primary" id="submitCustom">Add exercise</button>
        </div>
      </div>
    </div>
  `;

  // ── State ────────────────────────────────────────────────────────────────
  let exercises = [];
  let currentExerciseId = null;
  let liftChart = null;

  // ── Init ─────────────────────────────────────────────────────────────────
  async function init() {
    try {
      exercises = await apiRequest("/exercises");
      populateExerciseSelects();
      loadProgress(exercises[0]?.id);
      loadPersonalRecords();
      window.hideLoading && window.hideLoading();
    } catch (err) {
      handleApiError(err);
      window.hideLoading && window.hideLoading();
    }
  }

  function populateExerciseSelects() {
    const html = buildGroupedExerciseOptions(exercises);
    document.getElementById("exerciseSelect").innerHTML = html;
    document.getElementById("modalExercise").innerHTML = html;
  }

  // ── Load progress ─────────────────────────────────────────────────────────
  async function loadProgress(exerciseId) {
    if (!exerciseId) return;
    currentExerciseId = exerciseId;

    try {
      const data = await apiRequest(`/lifts/progress/${exerciseId}`);

      if (!data.has_data) {
        document.getElementById("progressSection").style.display = "none";
        document.getElementById("noDataMsg").style.display = "block";
        return;
      }

      document.getElementById("noDataMsg").style.display = "none";
      document.getElementById("progressSection").style.display = "block";

      // Stats
      document.getElementById("latest1rm").textContent = fmtKg(data.latest_session_1rm_kg);
      document.getElementById("pr1rm").textContent = fmtKg(data.personal_record_1rm_kg);
      document.getElementById("prDate").textContent = fmtDate(data.personal_record_date);

      const delta = fmtDelta(data.change_pct, "%");
      document.getElementById("changePct").textContent = delta.text + " since first log";
      document.getElementById("changePct").className = "stat-sub " + delta.cls;

      // Chart title
      document.getElementById("chartTitle").textContent =
        data.exercise.toUpperCase() + " — ESTIMATED 1RM OVER TIME";
      document.getElementById("muscleGroupTag").textContent =
        data.muscle_group ? data.muscle_group.toUpperCase() : "";

      // Strength level
      renderStrengthLevel(data);

      // Chart
      renderChart(data.series, data.exercise);

      // Sessions grouped by date
      renderSessionsGrouped(data.sessions_grouped, exerciseId);

    } catch (err) {
      handleApiError(err);
    }
  }

  // ── Strength level ────────────────────────────────────────────────────────
  function renderStrengthLevel(data) {
    const card = document.getElementById("strengthLevelDisplay");
    const scaleWrap = document.getElementById("strengthScaleWrap");
    const scaleEl = document.getElementById("strengthScale");
    const labelsEl = document.getElementById("strengthScaleLabels");

    const level = data.approximate_strength_level;
    const reason = data.strength_reason;
    const breakpoints = data.strength_breakpoints_kg;
    const pr = data.personal_record_1rm_kg;

    const levelColors = {
      beginner: "#6b7280",
      novice: "#3b82f6",
      intermediate: "#f59e0b",
      advanced: "#10b981",
      elite: "#c0392b",
    };
    const levelEmojis = {
      beginner: "🌱",
      novice: "📈",
      intermediate: "💪",
      advanced: "🔥",
      elite: "🏆",
    };

    if (!level && reason) {
      card.innerHTML = `
        <div style="font-size:13px;color:#a09880;line-height:1.4;">${reason}</div>
      `;
      scaleWrap.style.display = "none";
      return;
    }

    if (level) {
      const color = levelColors[level] || "#a09880";
      card.innerHTML = `
        <div class="strength-level-badge" style="background:${color}20;border:1px solid ${color}40;">
          <span style="font-size:18px;">${levelEmojis[level] || "💪"}</span>
          <span style="color:${color};font-size:16px;font-weight:700;text-transform:capitalize;">${level}</span>
        </div>
        <div style="font-size:11px;color:#a09880;margin-top:4px;">vs population avg</div>
      `;
    }

    // Visual strength scale
    if (breakpoints) {
      scaleWrap.style.display = "block";
      const tiers = ["beginner", "novice", "intermediate", "advanced", "elite"];
      const tierColors = ["#6b7280", "#3b82f6", "#f59e0b", "#10b981", "#c0392b"];

      // Build scale segments
      const maxVal = breakpoints.elite * 1.3;
      let scaleHtml = "";
      let labelsHtml = "";

      tiers.forEach((tier, i) => {
        const val = breakpoints[tier];
        const nextVal = i < tiers.length - 1 ? breakpoints[tiers[i + 1]] : maxVal;
        const segWidth = ((nextVal - val) / maxVal * 100).toFixed(1);
        const isActive = level === tier;
        scaleHtml += `<div class="scale-seg ${isActive ? "active" : ""}"
          style="width:${segWidth}%;background:${tierColors[i]};opacity:${isActive ? 1 : 0.35};"
          title="${tier}: ${val}kg"></div>`;
        labelsHtml += `<div class="scale-label" style="width:${segWidth}%;color:${tierColors[i]};">
          <div style="font-size:10px;font-weight:600;text-transform:capitalize;">${tier}</div>
          <div style="font-size:9px;">${val}kg</div>
        </div>`;
      });

      // User marker
      const userPct = Math.min(95, (pr / maxVal * 100)).toFixed(1);
      scaleHtml += `<div class="scale-marker" style="left:${userPct}%" title="Your PR: ${pr}kg">
        <div class="scale-marker-arrow"></div>
        <div class="scale-marker-label">${pr}kg</div>
      </div>`;

      scaleEl.innerHTML = `<div class="scale-track">${scaleHtml}</div>`;
      labelsEl.innerHTML = labelsHtml;
    } else {
      scaleWrap.style.display = "none";
    }
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  function renderChart(series, exerciseName) {
    if (liftChart) { liftChart.destroy(); liftChart = null; }
    if (!series || series.length === 0) return;

    const ctx = document.getElementById("liftChart").getContext("2d");
    liftChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.map(s => fmtDate(s.date)),
        datasets: [{
          label: "Est. 1RM (kg)",
          data: series.map(s => s.estimated_1rm_kg),
          borderColor: "#c0392b",
          backgroundColor: "rgba(192,57,43,0.1)",
          pointBackgroundColor: "#c0392b",
          pointRadius: series.length < 10 ? 5 : 3,
          tension: 0.3,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Est. 1RM: ${ctx.parsed.y} kg`,
            }
          }
        },
        scales: {
          x: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#a09880", font: { size: 11 } } },
          y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#a09880", font: { size: 11 } } },
        }
      }
    });
  }

  // ── Sessions grouped by date (collapsible) ────────────────────────────────
  function renderSessionsGrouped(sessions, exerciseId) {
    const container = document.getElementById("sessionsList");
    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div class="empty-row">No sessions yet.</div>';
      return;
    }

    const html = sessions.map((session, idx) => {
      const setsHtml = session.sets.map(set => `
        <div class="set-row" data-id="${set.id}">
          <span class="set-num">${set.set_number != null ? "#" + set.set_number : "—"}</span>
          <span class="set-weight">${set.weight_kg} kg</span>
          <span class="set-reps">${set.reps} reps</span>
          <span class="set-rpe">${set.rpe != null ? "RPE " + set.rpe : "—"}</span>
          <span class="set-note">${set.notes || ""}</span>
          <button class="set-delete-btn" data-logid="${set.id}" title="Delete set">🗑</button>
        </div>
      `).join("");

      const isFirst = idx === 0; // expand latest session by default
      return `
        <div class="session-group">
          <div class="session-date-row" data-idx="${idx}">
            <span class="session-date-label">${formatFullDate(session.date)}</span>
            <span class="session-meta">${session.set_count} sets · ${session.volume_kg} kg vol · Best 1RM: ${session.best_1rm_kg} kg</span>
            <span class="session-chevron" id="chevron-${idx}">${isFirst ? "▲" : "▼"}</span>
          </div>
          <div class="session-sets" id="sets-${idx}" style="${isFirst ? "" : "display:none;"}">
            <div class="set-row set-row-header">
              <span class="set-num">SET</span>
              <span class="set-weight">WEIGHT</span>
              <span class="set-reps">REPS</span>
              <span class="set-rpe">RPE</span>
              <span class="set-note">NOTES</span>
              <span></span>
            </div>
            ${setsHtml}
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = html;

    // Toggle expand/collapse
    container.querySelectorAll(".session-date-row").forEach(row => {
      row.addEventListener("click", () => {
        const idx = row.dataset.idx;
        const sets = document.getElementById("sets-" + idx);
        const chevron = document.getElementById("chevron-" + idx);
        const isOpen = sets.style.display !== "none";
        sets.style.display = isOpen ? "none" : "block";
        chevron.textContent = isOpen ? "▼" : "▲";
      });
    });

    // Delete set buttons
    container.querySelectorAll(".set-delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const logId = btn.dataset.logid;
        if (!confirm("Delete this set?")) return;
        try {
          await apiRequest(`/lifts/${logId}`, { method: "DELETE" });
          loadProgress(currentExerciseId);
          loadPersonalRecords();
        } catch (err) {
          handleApiError(err);
        }
      });
    });
  }

  function formatFullDate(isoDate) {
    const d = new Date(isoDate + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  // ── Personal Records grouped by muscle ───────────────────────────────────
  async function loadPersonalRecords() {
    try {
      const data = await apiRequest("/lifts/personal-records");
      const section = document.getElementById("prSection");

      if (!data.grouped || data.grouped.length === 0) {
        section.style.display = "none";
        return;
      }

      section.style.display = "block";
      const container = document.getElementById("prGroupedList");

      const levelColors = {
        beginner: "#6b7280", novice: "#3b82f6",
        intermediate: "#f59e0b", advanced: "#10b981", elite: "#c0392b",
      };

      const html = data.grouped.map(group => {
        const rows = group.records.map(pr => {
          const levelColor = pr.strength_level ? (levelColors[pr.strength_level] || "#a09880") : "#a09880";
          const levelBadge = pr.strength_level
            ? `<span class="pr-level-badge" style="background:${levelColor}20;color:${levelColor};border:1px solid ${levelColor}40;">${pr.strength_level}</span>`
            : `<span class="pr-level-badge" style="color:#6b7280;background:#1e232720;">—</span>`;

          return `
            <div class="pr-row" data-exid="${pr.exercise_id}" style="cursor:pointer;">
              <div class="pr-exercise">${pr.exercise}</div>
              <div class="pr-1rm">${fmtKg(pr.estimated_1rm_kg)} <span class="pr-unit">kg</span></div>
              <div class="pr-achieved">${pr.achieved_with.weight_kg}kg × ${pr.achieved_with.reps}</div>
              <div class="pr-date">${fmtDate(pr.date)}</div>
              <div class="pr-level">${levelBadge}</div>
            </div>
          `;
        }).join("");

        return `
          <div class="pr-group">
            <div class="pr-group-header">${group.label}</div>
            <div class="pr-group-table-header">
              <span>EXERCISE</span><span>EST. 1RM</span><span>BEST SET</span><span>DATE</span><span>LEVEL</span>
            </div>
            ${rows}
          </div>
        `;
      }).join("");

      container.innerHTML = html;

      // Click PR row to view that exercise
      container.querySelectorAll(".pr-row").forEach(row => {
        row.addEventListener("click", () => {
          const exId = parseInt(row.dataset.exid);
          document.getElementById("exerciseSelect").value = exId;
          loadProgress(exId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });

    } catch (err) {
      handleApiError(err);
    }
  }

  // ── Exercise select change ────────────────────────────────────────────────
  document.getElementById("exerciseSelect").addEventListener("change", function () {
    loadProgress(parseInt(this.value));
  });

  // ── Log Session Modal ─────────────────────────────────────────────────────
  let setCount = 0;

  function openLogModal() {
    setCount = 0;
    document.getElementById("setsContainer").innerHTML = "";
    document.getElementById("modalDate").value = todayIso();
    document.getElementById("modalNotes").value = "";
    addSetRow();
    if (currentExerciseId) document.getElementById("modalExercise").value = currentExerciseId;
    document.getElementById("logModal").style.display = "flex";
  }

  function addSetRow() {
    setCount++;
    const div = document.createElement("div");
    div.className = "modal-set-row";
    div.innerHTML = `
      <span class="modal-set-num">Set ${setCount}</span>
      <input type="number" class="text-input set-weight-input" placeholder="kg" min="0" step="0.5" style="width:80px;">
      <span style="color:#a09880;font-size:13px;">×</span>
      <input type="number" class="text-input set-reps-input" placeholder="reps" min="1" max="100" style="width:70px;">
      <input type="number" class="text-input set-rpe-input" placeholder="RPE" min="1" max="10" step="0.5" style="width:65px;">
      <button class="set-remove-btn" title="Remove">✕</button>
    `;
    div.querySelector(".set-remove-btn").addEventListener("click", () => div.remove());
    document.getElementById("setsContainer").appendChild(div);
  }

  document.getElementById("logSessionBtn").addEventListener("click", openLogModal);
  document.getElementById("logFirstBtn")?.addEventListener("click", openLogModal);
  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("logModal").style.display = "none";
  });
  document.getElementById("cancelModal").addEventListener("click", () => {
    document.getElementById("logModal").style.display = "none";
  });
  document.getElementById("addSetBtn").addEventListener("click", addSetRow);

  document.getElementById("submitSession").addEventListener("click", async () => {
    const exerciseId = parseInt(document.getElementById("modalExercise").value);
    const date = document.getElementById("modalDate").value;
    const notes = document.getElementById("modalNotes").value.trim() || null;

    const setRows = document.querySelectorAll(".modal-set-row");
    const sets = [];
    let valid = true;

    setRows.forEach(row => {
      const weight = parseFloat(row.querySelector(".set-weight-input").value);
      const reps = parseInt(row.querySelector(".set-reps-input").value);
      const rpe = parseFloat(row.querySelector(".set-rpe-input").value) || null;
      if (isNaN(weight) || isNaN(reps) || weight < 0 || reps < 1) { valid = false; return; }
      sets.push({ weight_kg: weight, reps, rpe: rpe || null });
    });

    if (!valid || sets.length === 0) {
      showToast("Please fill in weight and reps for all sets.", "error");
      return;
    }

    const btn = document.getElementById("submitSession");
    btn.disabled = true;
    btn.textContent = "Saving…";

    try {
      await apiRequest("/lifts/session", { method: "POST", body: { exercise_id: exerciseId, date, sets, notes } });
      document.getElementById("logModal").style.display = "none";
      showToast("Session saved!");
      loadProgress(exerciseId);
      loadPersonalRecords();
    } catch (err) {
      handleApiError(err, "Failed to save session.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save session";
    }
  });

  // ── Custom Exercise Modal ─────────────────────────────────────────────────
  document.getElementById("addCustomBtn").addEventListener("click", () => {
    document.getElementById("customName").value = "";
    document.getElementById("customModal").style.display = "flex";
  });
  document.getElementById("closeCustomModal").addEventListener("click", () => {
    document.getElementById("customModal").style.display = "none";
  });
  document.getElementById("cancelCustom").addEventListener("click", () => {
    document.getElementById("customModal").style.display = "none";
  });

  document.getElementById("submitCustom").addEventListener("click", async () => {
    const name = document.getElementById("customName").value.trim();
    const muscle_group = document.getElementById("customMuscle").value || null;
    const category = document.getElementById("customCategory").value || null;
    if (!name) { showToast("Please enter an exercise name.", "error"); return; }

    const btn = document.getElementById("submitCustom");
    btn.disabled = true;
    try {
      const ex = await apiRequest("/exercises", { method: "POST", body: { name, muscle_group, category } });
      exercises.push(ex);
      populateExerciseSelects();
      document.getElementById("exerciseSelect").value = ex.id;
      document.getElementById("customModal").style.display = "none";
      showToast("Exercise added!");
      loadProgress(ex.id);
    } catch (err) {
      handleApiError(err);
    } finally {
      btn.disabled = false;
    }
  });

  init();
})();
