// lifts.js — IRONLOG Lifts Page
// Features:
// - Sessions grouped by date, collapsible
// - Personal Records grouped by muscle group
// - Strength level with visual breakpoint scale for ALL exercises

(function () {

  function chartColors() {
    const isDark = !document.documentElement.getAttribute('data-theme') ||
                    document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      tick:  isDark ? '#6b7280' : '#78716c',
      grid:  isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    };
  }
  renderShell("lifts", "Lifts", "Estimated 1RM, PRs, and strength trend per exercise.");

  const pageHeaderActions = document.getElementById("pageHeaderActions");
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.set-menu-container')) {
      document.querySelectorAll('.set-dropdown').forEach(d => d.style.display = 'none');
    }
  });
  pageHeaderActions.innerHTML = `<button class="btn btn-primary" id="logSessionBtn">+ Log a session</button>`;

  const content = document.getElementById("pageContent");
  content.innerHTML = `
    <div id="liftsPage">
    <!-- Edit Set Modal -->
    <div id="editSetModal" class="wk-modal-overlay" style="display:none; z-index:9999;">
      <div class="wk-modal" style="max-width:350px;">
        <div class="wk-modal-header">
          <h2 style="margin:0; font-size:18px;">Edit Set</h2>
        </div>
        <form id="editSetForm" style="display:flex; flex-direction:column;">
          <div class="wk-modal-body" style="display:flex; flex-direction:column; gap:16px;">
            <input type="hidden" id="editSetId">
            <div style="display:flex; gap:12px;">
              <div style="flex:1;">
                <label class="form-label" style="font-size:12px; margin-bottom:4px; display:block; color:var(--text-secondary);">Weight (kg)</label>
                <input type="number" id="editSetWeight" step="0.1" class="form-control" required style="width:100%; box-sizing:border-box;">
              </div>
              <div style="flex:1;">
                <label class="form-label" style="font-size:12px; margin-bottom:4px; display:block; color:var(--text-secondary);">Reps</label>
                <input type="number" id="editSetReps" class="form-control" required style="width:100%; box-sizing:border-box;">
              </div>
            </div>
            <div>
              <label class="form-label" style="font-size:12px; margin-bottom:4px; display:block; color:var(--text-secondary);">RPE (Optional)</label>
              <input type="number" id="editSetRPE" step="0.5" class="form-control" min="1" max="10" style="width:100%; box-sizing:border-box;">
            </div>
            <div>
              <label class="form-label" style="font-size:12px; margin-bottom:4px; display:block; color:var(--text-secondary);">Notes</label>
              <textarea id="editSetNotes" class="form-control" rows="2" style="width:100%; box-sizing:border-box; resize:vertical;"></textarea>
            </div>
          </div>
          <div class="wk-modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('editSetModal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary" id="editSetSaveBtn">Save</button>
          </div>
        </form>
      </div>
    </div>

      <!-- Two-step exercise selector -->
      <div class="lifts-selector-row">
        <div class="lifts-selector-field">
          <label class="field-label" for="muscleGroupSelect">Muscle Group</label>
          <select id="muscleGroupSelect" class="select-input lifts-select"></select>
        </div>
        <div class="lifts-selector-field" id="exerciseStep" style="display:none;">
          <label class="field-label" for="exerciseSelect">Exercise</label>
          <div style="display:flex; gap:8px;">
            <select id="exerciseSelect" class="select-input lifts-select" style="flex:1;"></select>
            <button class="btn btn-secondary lifts-custom-btn" id="exerciseInfoBtnDesktop" style="margin-top:0;" title="Exercise Info">Info</button>
          </div>
        </div>
        <div id="customBtnWrapper" style="display:flex; justify-content:space-between; align-items:center;">
          <button class="btn btn-secondary lifts-custom-btn" id="addCustomBtn">+ Custom</button>
          <button class="btn btn-secondary lifts-custom-btn" id="exerciseInfoBtnMobile" style="display:none;" title="Exercise Info">Info</button>
        </div>
      </div>

      <!-- Progress section -->
      <div id="progressSection" style="display:none;">

        <!-- Stats row -->
        <div class="lifts-stats-row">
          <div class="stat-card">
            <div class="stat-label" data-label="latest">LATEST EST. 1RM</div>
            <div class="stat-big"><span id="latest1rm">—</span> <span class="stat-unit" id="latest1rmUnit">kg</span></div>
            <div class="stat-sub" id="changePct"></div>
          </div>
          <div class="stat-card">
            <div class="stat-label" data-label="pr">PERSONAL RECORD</div>
            <div class="stat-big"><span id="pr1rm">—</span> <span class="stat-unit" id="pr1rmUnit">kg</span></div>
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
      <div id="noDataMsg" style="display:none;"></div>

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
          <div class="field" id="modalMuscleGroupField">
            <label class="field-label">Muscle Group</label>
            <select id="modalMuscleGroup" class="select-input lifts-select"></select>
          </div>
          <div class="field">
            <label class="field-label">Exercise</label>
            <select id="modalExercise" class="select-input lifts-select"></select>
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
              <option value="quads">Quads</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="glutes">Glutes</option>
              <option value="adductors">Adductors</option>
              <option value="legs">Legs</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="abs">Abs</option>
              <option value="calves">Calves</option>
              <option value="forearms">Forearms</option>
              <option value="neck">Neck</option>
              <option value="hip flexors">Hip Flexors</option>
              <option value="full body">Full Body</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Category (optional)</label>
            <select id="customCategory" class="select-input">
              <option value="">Select…</option>
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Secondary Muscle (optional)</label>
            <input type="text" id="customSecondaryMuscle" class="text-input" placeholder="e.g. Triceps, Front Delt">
          </div>
          <div class="field">
            <label class="field-label">Equipment (optional)</label>
            <input type="text" id="customEquipment" class="text-input" placeholder="e.g. Dumbbell, Machine">
          </div>
          <div class="field">
            <label class="field-label">Difficulty (optional)</label>
            <select id="customDifficulty" class="select-input">
              <option value="">Select…</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Instructions (optional)</label>
            <textarea id="customInstructions" class="text-input" placeholder="How to perform..." rows="2"></textarea>
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
      // loadProgress is called inside populateMuscleGroupPills automatically
      loadPersonalRecords();
      window.hideLoading && window.hideLoading();
    } catch (err) {
      handleApiError(err);
      window.hideLoading && window.hideLoading();
    }
  }

  // ── Muscle group order ───────────────────────────────────────────────────
  const MUSCLE_ORDER = [
    "chest", "back", "shoulders", "quads", "hamstrings",
    "glutes", "adductors", "legs", "biceps", "triceps",
    "abs", "calves", "forearms", "neck", "hip flexors", "full body", "other"
  ];

  const MUSCLE_ICONS = {
    chest: "🫀", back: "🦬", shoulders: "💪", quads: "🦵",
    hamstrings: "🦵", glutes: "🍑", adductors: "🦵", legs: "🦵",
    biceps: "💪", triceps: "💪", abs: "🍫", calves: "🦶",
    forearms: "💪", neck: "🦒", "hip flexors": "🦵", "full body": "🦍", other: "🏋️"
  };

  const MUSCLE_LABELS = {
    chest: "Chest", back: "Back", shoulders: "Shoulders",
    quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes",
    adductors: "Adductors", legs: "Legs", biceps: "Biceps",
    triceps: "Triceps", abs: "Abs", calves: "Calves",
    forearms: "Forearms", neck: "Neck", "hip flexors": "Hip Flexors",
    "full body": "Full Body", other: "Other"
  };

  let selectedMuscleGroup = null;

  function getGroupedExercises() {
    const groups = {};
    for (const ex of exercises) {
      const key = (ex.muscle_group || "other").toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(ex);
    }
    // Sort exercises within each group alphabetically
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
  }

  function populateMuscleGroupPills() {
    const groups = getGroupedExercises();
    const select = document.getElementById("muscleGroupSelect");

    // Defensive check
    if (!select) {
      console.warn("[lifts.js] muscleGroupSelect not found in DOM, retrying in 100ms...");
      setTimeout(populateMuscleGroupPills, 100);
      return;
    }

    // Build ordered list of groups that have exercises
    const orderedGroups = MUSCLE_ORDER.filter(g => groups[g]);
    const extraGroups = Object.keys(groups).filter(g => !MUSCLE_ORDER.includes(g)).sort();
    const allGroups = [...orderedGroups, ...extraGroups];

    select.innerHTML = allGroups.map(g =>
      `<option value="${g}">${MUSCLE_LABELS[g] || g} (${groups[g].length})</option>`
    ).join("");

    // Change handler
    select.addEventListener("change", () => {
      selectedMuscleGroup = select.value;
      populateExerciseSelect(groups[selectedMuscleGroup]);
      document.getElementById("exerciseStep").style.display = "";
      const isMobile = window.innerWidth <= 768;
      document.getElementById("customBtnWrapper").style.width = isMobile ? "100%" : "auto";
      document.getElementById("exerciseInfoBtnDesktop").style.display = isMobile ? "none" : "";
      document.getElementById("exerciseInfoBtnMobile").style.display = isMobile ? "" : "none";
    });

    // Auto-select first group
    if (allGroups.length > 0) {
      selectedMuscleGroup = allGroups[0];
      select.value = allGroups[0];
      populateExerciseSelect(groups[selectedMuscleGroup]);
      document.getElementById("exerciseStep").style.display = "";
      const isMobile = window.innerWidth <= 768;
      document.getElementById("customBtnWrapper").style.width = isMobile ? "100%" : "auto";
      document.getElementById("exerciseInfoBtnDesktop").style.display = isMobile ? "none" : "";
      document.getElementById("exerciseInfoBtnMobile").style.display = isMobile ? "" : "none";
    }
  }

  function populateExerciseSelect(groupExercises) {
    const select = document.getElementById("exerciseSelect");
    select.innerHTML = groupExercises.map(ex =>
      `<option value="${ex.id}">${ex.name}</option>`
    ).join("");
    // Trigger load for first exercise in group
    if (groupExercises.length > 0) {
      loadProgress(groupExercises[0].id);
    }
  }

  function populateExerciseSelects() {
    populateMuscleGroupPills();
    populateModalMuscleGroup();
  }

  function populateModalMuscleGroup() {
    const groups = getGroupedExercises();
    const selectMuscle = document.getElementById("modalMuscleGroup");
    const selectExercise = document.getElementById("modalExercise");

    if (!selectMuscle || !selectExercise) return;

    const orderedGroups = MUSCLE_ORDER.filter(g => groups[g]);
    const extraGroups = Object.keys(groups).filter(g => !MUSCLE_ORDER.includes(g)).sort();
    const allGroups = [...orderedGroups, ...extraGroups];

    selectMuscle.innerHTML = allGroups.map(g =>
      `<option value="${g}">${MUSCLE_LABELS[g] || g} (${groups[g].length})</option>`
    ).join("");

    selectMuscle.addEventListener("change", () => {
      const g = selectMuscle.value;
      if (groups[g]) {
        selectExercise.innerHTML = groups[g].map(ex =>
          `<option value="${ex.id}">${ex.name}</option>`
        ).join("");
      }
    });

    if (allGroups.length > 0) {
      selectMuscle.value = allGroups[0];
      selectMuscle.dispatchEvent(new Event("change"));
    }
  }

  // ── Load progress ─────────────────────────────────────────────────────────
  async function loadProgress(exerciseId) {
    if (!exerciseId) return;
    currentExerciseId = exerciseId;

    try {
      const data = await apiRequest(`/lifts/progress/${exerciseId}`);

      if (!data.has_data) {
        document.getElementById("progressSection").style.display = "none";
        const noDataEl = document.getElementById("noDataMsg");
        noDataEl.innerHTML = buildEmptyState(
          "No sessions logged",
          "You haven't logged any data for this exercise yet.",
          "Log your first session",
          "#"
        );
        noDataEl.style.display = "block";
        setTimeout(() => {
          const btn = noDataEl.querySelector('.btn-primary');
          if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); openLogModal(exerciseId); });
        }, 0);
        return;
      }

      document.getElementById("noDataMsg").style.display = "none";
      document.getElementById("progressSection").style.display = "block";

      // ALWAYS reset labels first to avoid stale values when switching exercises
      document.querySelector('[data-label="latest"]').textContent = "LATEST EST. 1RM";
      document.querySelector('[data-label="pr"]').textContent = "PERSONAL RECORD";
      document.getElementById("latest1rmUnit").textContent = "kg";
      document.getElementById("pr1rmUnit").textContent = "kg";

      // Stats — bodyweight exercises show reps, weighted show kg
      const isBWExercise = !!(data.is_bodyweight || data.is_bodyweight_exercise);
      if (isBWExercise) {
        // Change card labels for bodyweight — show reps not kg
        document.querySelector('[data-label="latest"]').textContent = "BEST REPS (LATEST SESSION)";
        document.querySelector('[data-label="pr"]').textContent = "BEST REPS EVER";
        document.getElementById("latest1rm").textContent = data.latest_session_best_reps || data.best_reps_ever || "—";
        document.getElementById("latest1rmUnit").textContent = "reps";
        document.getElementById("pr1rm").textContent = data.best_reps_ever || "—";
        document.getElementById("pr1rmUnit").textContent = "reps";
        document.getElementById("prDate").textContent = fmtDate(data.personal_record_date);
        document.getElementById("changePct").textContent = "Bodyweight — classified by max reps";
        document.getElementById("changePct").className = "stat-sub neutral";
      } else {
        document.getElementById("latest1rm").textContent = fmtKg(data.latest_session_1rm_kg);
        document.getElementById("pr1rm").textContent = fmtKg(data.personal_record_1rm_kg);
        document.getElementById("prDate").textContent = fmtDate(data.personal_record_date);
        if (data.change_pct != null) {
          const delta = fmtDelta(data.change_pct, "%");
          document.getElementById("changePct").textContent = delta.text + " since last log";
          document.getElementById("changePct").className = "stat-sub " + delta.cls;
        } else {
          document.getElementById("changePct").textContent = "First log";
          document.getElementById("changePct").className = "stat-sub neutral";
        }
      }

      // Chart title
      document.getElementById("chartTitle").textContent =
        data.exercise.toUpperCase() + (isBWExercise ? " — BEST REPS OVER TIME" : " — ESTIMATED 1RM OVER TIME");
      document.getElementById("muscleGroupTag").textContent =
        data.muscle_group ? data.muscle_group.toUpperCase() : "";

      // Strength level
      renderStrengthLevel(data);

      // Chart
      renderChart(data.series, data.exercise, isBWExercise, data.sessions_grouped);

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
    const isBW = data.is_bodyweight_exercise;
    const bestReps = data.best_reps_ever || 0;
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
      card.innerHTML = `<div style="font-size:13px;color:#a09880;line-height:1.4;">${reason}</div>`;
      scaleWrap.style.display = "none";
      return;
    }

    if (level) {
      if (data.percentile != null) {
        card.innerHTML = `
          <div class="percentile-card" style="margin-bottom: 24px; text-align: left;">
            <div class="pct-header">
              <span class="pct-title">${data.exercise} Rank</span>
              <span class="pct-badge">Top ${100 - Math.round(data.percentile)}%</span>
            </div>
            <div class="pct-body">
              <div class="pct-circle">
                <span class="pct-num">${Math.round(data.percentile)}</span>
                <span class="pct-sym">%</span>
              </div>
              <div class="pct-text">You are stronger than ${Math.round(data.percentile)}% of lifters your bodyweight.</div>
            </div>
            <div class="pct-bar-bg">
              <div class="pct-bar-fill" style="width: ${data.percentile}%;"></div>
            </div>
          </div>
        `;
      } else {
        const color = levelColors[level] || "#a09880";
        const subtitle = isBW
          ? `Best: ${bestReps} reps · vs population avg`
          : "vs population avg";
        card.innerHTML = `
          <div class="strength-level-badge" style="background:${color}20;border:1px solid ${color}40;">
            <span style="font-size:18px;">${levelEmojis[level] || "💪"}</span>
            <span style="color:${color};font-size:16px;font-weight:700;text-transform:capitalize;">${level}</span>
          </div>
          <div style="font-size:11px;color:#a09880;margin-top:4px;">${subtitle}</div>
        `;
      }
    }

    // Visual strength scale
    if (breakpoints) {
      scaleWrap.style.display = "block";
      const tiers = ["beginner", "novice", "intermediate", "advanced", "elite"];
      const tierColors = ["#6b7280", "#3b82f6", "#f59e0b", "#10b981", "#c0392b"];

      if (isBW) {
        // Reps-based scale — parse "X reps" or "X seconds" strings
        const repValues = tiers.map(t => {
          const val = breakpoints[t];
          return typeof val === "string" ? parseInt(val) : val;
        });
        const unit = typeof breakpoints.beginner === "string"
          ? breakpoints.beginner.replace(/[0-9]/g, "").trim()
          : "reps";
        const maxReps = repValues[4] * 1.3;
        let scaleHtml = "";
        let labelsHtml = "";

        // Grey pre-beginner segment (0 → beginner reps)
        const preBegReps = (repValues[0] / maxReps * 100).toFixed(1);
        scaleHtml += `<div class="scale-seg"
          style="width:${preBegReps}%;background:#374151;opacity:0.4;"
          title="Below beginner"></div>`;
        labelsHtml += `<div class="scale-label" style="width:${preBegReps}%;"></div>`;

        tiers.forEach((tier, i) => {
          const val = repValues[i];
          const nextVal = i < tiers.length - 1 ? repValues[i + 1] : maxReps;
          const segWidth = ((nextVal - val) / maxReps * 100).toFixed(1);
          const isActive = level === tier;
          scaleHtml += `<div class="scale-seg ${isActive ? "active" : ""}"
            style="width:${segWidth}%;background:${tierColors[i]};opacity:${isActive ? 1 : 0.35};"
            title="${tier}: ${val} ${unit}"></div>`;
          labelsHtml += `<div class="scale-label" style="width:${segWidth}%;color:${tierColors[i]};">
            <div style="font-size:10px;font-weight:600;text-transform:capitalize;">${tier}</div>
            <div style="font-size:9px;">${val} ${unit}</div>
          </div>`;
        });

        // User marker: position = bestReps / maxReps * 100 (aligns with 0→maxReps scale)
        const userPct = Math.min(97, (bestReps / maxReps * 100)).toFixed(1);
        const markerLabel = bestReps > 0 ? `${bestReps} ${unit}` : "0";
        scaleHtml += `<div class="scale-marker" style="left:${userPct}%" title="Your best: ${markerLabel}">
          <div class="scale-marker-arrow"></div>
          <div class="scale-marker-label">${markerLabel}</div>
        </div>`;

        scaleEl.innerHTML = `<div class="scale-track">${scaleHtml}</div>`;
        labelsEl.innerHTML = labelsHtml;

      } else {
        // Weight-based scale — values are kg numbers
        // IMPORTANT: Scale spans 0 → maxVal. First segment is grey (0 → beginner).
        // Each tier segment goes from its breakpoint to the next.
        // User marker uses (pr / maxVal * 100) which aligns correctly with this layout.
        const maxVal = breakpoints.elite * 1.3;
        let scaleHtml = "";
        let labelsHtml = "";

        // Grey pre-beginner segment (0 → beginner breakpoint)
        const preBegWidth = (breakpoints.beginner / maxVal * 100).toFixed(1);
        scaleHtml += `<div class="scale-seg"
          style="width:${preBegWidth}%;background:#374151;opacity:0.4;"
          title="Below beginner"></div>`;
        // Empty label spacer for pre-beginner
        labelsHtml += `<div class="scale-label" style="width:${preBegWidth}%;"></div>`;

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

        // User marker: position = pr / maxVal * 100 (correct since scale spans 0→maxVal)
        const userPct = Math.min(97, (pr / maxVal * 100)).toFixed(1);
        scaleHtml += `<div class="scale-marker" style="left:${userPct}%" title="Your PR: ${pr}kg">
          <div class="scale-marker-arrow"></div>
          <div class="scale-marker-label">${pr}kg</div>
        </div>`;

        scaleEl.innerHTML = `<div class="scale-track">${scaleHtml}</div>`;
        labelsEl.innerHTML = labelsHtml;
      }
    } else {
      scaleWrap.style.display = "none";
    }
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  function renderChart(series, exerciseName, isBW, sessionsGrouped) {
    if (liftChart) { liftChart.destroy(); liftChart = null; }
    if (!series || series.length === 0) return;

    const ctx = document.getElementById("liftChart").getContext("2d");

    let chartData, chartLabel, tooltipLabel, yLabel;

    if (isBW) {
      // For bodyweight exercises: show best reps per session over time
      // Use sessionsGrouped (newest first) reversed to oldest first for chart
      const chronological = sessionsGrouped ? [...sessionsGrouped].reverse() : [];
      chartData = chronological.map(s => Math.max(...s.sets.map(set => set.reps)));
      const labels = chronological.map(s => fmtDate(s.date));
      chartLabel = "Best Reps";
      tooltipLabel = ctx => `Best reps: ${ctx.parsed.y}`;
      yLabel = "Reps";

      liftChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [{
            label: chartLabel,
            data: chartData,
            borderColor: "#c0392b",
            backgroundColor: "rgba(192,57,43,0.1)",
            pointBackgroundColor: "#c0392b",
            pointRadius: chronological.length < 10 ? 5 : 3,
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: tooltipLabel } }
          },
          scales: {
            x: { grid: { color: chartColors().grid }, ticks: { color: chartColors().tick, font: { size: 11 } } },
            y: {
              grid: { color: "rgba(255,255,255,0.05)" },
              ticks: { color: "#a09880", font: { size: 11 }, stepSize: 1 },
              title: { display: true, text: yLabel, color: "#a09880", font: { size: 11 } },
            },
          }
        }
      });
    } else {
      // Weighted exercise: show estimated 1RM over time
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
              callbacks: { label: ctx => `Est. 1RM: ${ctx.parsed.y} kg` }
            }
          },
          scales: {
            x: { grid: { color: chartColors().grid }, ticks: { color: chartColors().tick, font: { size: 11 } } },
            y: { grid: { color: chartColors().grid }, ticks: { color: chartColors().tick, font: { size: 11 } } },
          }
        }
      });
    }
  }

  // ── Sessions grouped by date (collapsible) ────────────────────────────────
  function renderSessionsGrouped(sessions, exerciseId) {
    const container = document.getElementById("sessionsList");
    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<div class="empty-row">No sessions yet.</div>';
      return;
    }

    const html = sessions.map((session, idx) => {
      const setsHtml = session.sets.map((set, setIdx) => `
        <div class="set-row" data-id="${set.id}">
          <span class="set-num">#${setIdx + 1}</span>
          <span class="set-weight">${set.weight_kg} kg</span>
          <span class="set-reps">${set.reps} reps</span>
          <span class="set-rpe">${set.rpe != null ? "RPE " + set.rpe : "—"}</span>
          <span class="set-note">${set.notes || ""}</span>
          <div style="position:relative; display:flex; justify-content:flex-end;">
            <button class="set-menu-btn" title="Options" style="background:none; border:none; color:#a09880; cursor:pointer; font-size:18px; padding:4px 8px;">⋮</button>
            <div class="set-dropdown" style="display:none; position:absolute; right:0; top:100%; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:4px; z-index:50; box-shadow:0 4px 12px rgba(0,0,0,0.4); min-width:110px;">
              <button class="set-edit-btn" data-log='${JSON.stringify(set).replace(/'/g, "&apos;")}' style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none; border:none; color:var(--text-primary); cursor:pointer; font-size:14px; padding:8px 12px; border-radius:4px;">✏️ Edit</button>
              <button class="set-delete-btn" data-logid="${set.id}" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; background:none; border:none; color:var(--plate-red); cursor:pointer; font-size:14px; padding:8px 12px; border-radius:4px;">🗑️ Delete</button>
            </div>
          </div>
        </div>
      `).join("");

      const isFirst = idx === 0; // expand latest session by default
      return `
        <div class="session-group" style="overflow: visible !important;">
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

    // Toggle dropdowns
    container.querySelectorAll(".set-menu-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        const isOpen = dropdown.style.display === "block";
        document.querySelectorAll('.set-dropdown').forEach(d => d.style.display = 'none');
        if (!isOpen) {
          dropdown.style.display = "block";
        }
      });
    });

    // Close dropdowns on outside click
    document.addEventListener("click", () => {
      document.querySelectorAll('.set-dropdown').forEach(d => d.style.display = 'none');
    });

    // Delete set buttons
    container.querySelectorAll(".set-delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        document.querySelectorAll('.set-dropdown').forEach(d => d.style.display = 'none');
        const logId = btn.dataset.logid;
        const confirmed = await window.appConfirm('Delete Set', 'Delete this set?', 'Delete', 'Cancel');
        if (!confirmed) return;
        try {
          await apiRequest(`/lifts/${logId}`, { method: "DELETE" });
          loadProgress(currentExerciseId);
          loadPersonalRecords();
        } catch (err) {
          handleApiError(err);
        }
      });
    });

    // Edit set buttons
    container.querySelectorAll(".set-edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll('.set-dropdown').forEach(d => d.style.display = 'none');
        const log = JSON.parse(btn.dataset.log.replace(/&apos;/g, "'"));
        document.getElementById("editSetId").value = log.id;
        document.getElementById("editSetWeight").value = log.weight_kg;
        document.getElementById("editSetReps").value = log.reps;
        document.getElementById("editSetRPE").value = log.rpe || "";
        document.getElementById("editSetNotes").value = log.notes || "";
        document.getElementById("editSetModal").style.display = "flex";
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

          const isBW = pr.is_bodyweight;
          const prMetric = isBW
            ? `${pr.best_reps} reps`
            : `${fmtKg(pr.estimated_1rm_kg)} <span class="pr-unit">kg</span>`;
          const prAchieved = isBW
            ? `Best set: ${pr.achieved_with.reps} reps`
            : `${pr.achieved_with.weight_kg}kg × ${pr.achieved_with.reps}`;

          return `
            <div class="pr-row" data-exid="${pr.exercise_id}" style="cursor:pointer;">
              <div class="pr-exercise">
                ${pr.exercise}
              </div>
              <div class="pr-1rm">${prMetric}</div>
              <div class="pr-achieved">${prAchieved}</div>
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
  document.addEventListener("change", function(e) {
    if (e.target && e.target.id === "exerciseSelect") {
      loadProgress(parseInt(e.target.value));
    }
  });

  // ── Log Session Modal ─────────────────────────────────────────────────────
  let setCount = 0;

  function openLogModal() {
    setCount = 0;
    document.getElementById("setsContainer").innerHTML = "";
    document.getElementById("modalDate").value = todayIso();
    document.getElementById("modalNotes").value = "";
    addSetRow();
    if (currentExerciseId) {
      const ex = exercises.find(e => e.id == currentExerciseId);
      if (ex) {
        const mg = (ex.muscle_group || "other").toLowerCase();
        const selectMuscle = document.getElementById("modalMuscleGroup");
        if (selectMuscle) {
          selectMuscle.value = mg;
          selectMuscle.dispatchEvent(new Event("change"));
        }
        document.getElementById("modalExercise").value = currentExerciseId;
      }
    }
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
  document.getElementById("exerciseInfoBtnDesktop").addEventListener("click", () => {
    const exId = parseInt(document.getElementById("exerciseSelect").value, 10);
    if (!isNaN(exId) && window.showExerciseInfo) {
      window.showExerciseInfo(exId);
    }
  });

  document.getElementById("exerciseInfoBtnMobile").addEventListener("click", () => {
    const exId = parseInt(document.getElementById("exerciseSelect").value, 10);
    if (!isNaN(exId) && window.showExerciseInfo) {
      window.showExerciseInfo(exId);
    }
  });

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
    const secondary_muscle = document.getElementById("customSecondaryMuscle").value.trim() || null;
    const equipment = document.getElementById("customEquipment").value.trim() || null;
    const difficulty = document.getElementById("customDifficulty").value || null;
    const instructions = document.getElementById("customInstructions").value.trim() || null;
    if (!name) { showToast("Please enter an exercise name.", "error"); return; }

    const btn = document.getElementById("submitCustom");
    btn.disabled = true;
    try {
      const ex = await apiRequest("/exercises", { method: "POST", body: { name, muscle_group, category, secondary_muscle, equipment, difficulty, instructions } });
      exercises.push(ex);
      populateMuscleGroupPills();
      populateExerciseSelects();
      const newGroup = (ex.muscle_group || "other").toLowerCase();
      const mgSelect = document.getElementById("muscleGroupSelect");
      if (mgSelect) {
        mgSelect.value = newGroup;
        selectedMuscleGroup = newGroup;
        const grouped = getGroupedExercises();
        populateExerciseSelect(grouped[newGroup] || [ex]);
      }
      setTimeout(() => {
        document.getElementById("exerciseSelect").value = ex.id;
        loadProgress(ex.id);
      }, 50);
      document.getElementById("customModal").style.display = "none";
      showToast("Exercise created!");
      loadProgress(ex.id);
    } catch (err) {
      handleApiError(err);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("editSetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const logId = document.getElementById("editSetId").value;
    const payload = {
      weight_kg: parseFloat(document.getElementById("editSetWeight").value),
      reps: parseInt(document.getElementById("editSetReps").value, 10),
      rpe: document.getElementById("editSetRPE").value ? parseFloat(document.getElementById("editSetRPE").value) : null,
      notes: document.getElementById("editSetNotes").value || null
    };
    const btn = document.getElementById("editSetSaveBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";
    try {
      await apiRequest(`/lifts/${logId}`, { method: "PUT", body: payload });
      document.getElementById("editSetModal").style.display = "none";
      loadProgress(currentExerciseId);
      loadPersonalRecords();
    } catch (err) {
      handleApiError(err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  });

  // Run init on next tick to guarantee the DOM (content.innerHTML above)
  // has fully committed before we query for elements inside it.
  setTimeout(init, 0);
})();