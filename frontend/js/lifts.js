renderShell("lifts", "Lifts", "Estimated 1RM, PRs, and strength trend per exercise.");

let liftChart = null;
let exercises = [];
let selectedExerciseId = localStorage.getItem("ironlog_last_exercise") ? parseInt(localStorage.getItem("ironlog_last_exercise")) : null;

document.getElementById("pageHeaderActions").innerHTML = `
  <button class="btn btn-primary btn-sm" id="openLogBtn">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    Log a session
  </button>
`;

document.getElementById("pageContent").innerHTML = `
  <div class="flex gap-12 mb-16" style="align-items:center;flex-wrap:wrap;">
    <div class="field" style="margin-bottom:0;min-width:220px;">
      <label for="exerciseSelect">Viewing exercise</label>
      <select id="exerciseSelect"></select>
    </div>
    <button class="btn btn-secondary btn-sm" id="addExerciseBtn" style="margin-top:20px;">+ Custom exercise</button>
  </div>

  <div id="addExerciseCard" class="card mb-16" style="display:none;">
    <div class="card-title">New custom exercise</div>
    <div class="form-row">
      <div class="field"><label>Name</label><input id="newExName" placeholder="e.g. Trap Bar Deadlift"></div>
      <div class="field"><label>Category</label>
        <select id="newExCategory"><option value="compound">Compound</option><option value="isolation">Isolation</option><option value="core">Core</option></select>
      </div>
      <div class="field"><label>Muscle group</label><input id="newExMuscle" placeholder="e.g. back"></div>
    </div>
    <div class="flex gap-12">
      <button class="btn btn-primary btn-sm" id="saveExerciseBtn">Add exercise</button>
      <button class="btn btn-ghost btn-sm" id="cancelExerciseBtn">Cancel</button>
    </div>
  </div>

  <div id="formCard" class="card mb-16" style="display:none;">
    <div class="card-title">Log a session</div>
    <form id="liftForm">
      <div class="form-row">
        <div class="field" style="grid-column:1/-1;">
          <label for="lExercise">Exercise</label>
          <select id="lExercise" required></select>
        </div>
        <div class="field"><label for="lDate">Date</label><input type="date" id="lDate" required></div>
      </div>

      <div class="field">
        <label>Sets</label>
        <div id="setRows"></div>
        <button type="button" class="btn btn-secondary btn-sm mt-8" id="addSetRowBtn">+ Add another set</button>
      </div>

      <div class="field"><label for="lNotes">Notes <span class="text-tertiary">(optional, applies to the whole session)</span></label><input id="lNotes" placeholder="e.g. belt, felt strong"></div>
      <div class="flex gap-12">
        <button type="submit" class="btn btn-primary" id="lSubmitBtn">Save session</button>
        <button type="button" class="btn btn-ghost" id="lCancelBtn">Cancel</button>
      </div>
    </form>
  </div>

  <div id="progressSection"></div>

  <div class="bar-divider"><div class="collar"></div><div class="rail"></div><div class="label">All-time personal records</div><div class="rail"></div><div class="collar"></div></div>
  <div class="card"><div id="prTableWrap"></div></div>
`;

const formCard = document.getElementById("formCard");
const addExerciseCard = document.getElementById("addExerciseCard");

let sessionSets = [{ weight: "", reps: "", rpe: "" }];

function renderSetRows() {
  const wrap = document.getElementById("setRows");
  wrap.innerHTML = sessionSets.map((s, i) => `
    <div class="flex gap-12" style="align-items:flex-end;margin-bottom:10px;">
      <div style="font-size:12.5px;color:var(--text-secondary);font-weight:600;width:28px;padding-bottom:11px;flex-shrink:0;">#${i + 1}</div>
      <div class="field" style="margin-bottom:0;flex:1;">
        <label>Weight (kg)</label>
        <input type="number" step="0.5" min="0" class="set-weight" data-idx="${i}" value="${s.weight}" placeholder="e.g. 60" required>
      </div>
      <div class="field" style="margin-bottom:0;flex:1;">
        <label>Reps</label>
        <input type="number" min="1" max="100" class="set-reps" data-idx="${i}" value="${s.reps}" placeholder="e.g. 8" required>
      </div>
      <div class="field" style="margin-bottom:0;flex:1;">
        <label>RPE <span class="text-tertiary">(optional)</span></label>
        <input type="number" step="0.5" min="1" max="10" class="set-rpe" data-idx="${i}" value="${s.rpe}" placeholder="1–10">
      </div>
      <button type="button" class="icon-btn set-remove-btn" data-idx="${i}" style="margin-bottom:11px;flex-shrink:0;" ${sessionSets.length === 1 ? "disabled" : ""} title="Remove set">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join("");

  wrap.querySelectorAll(".set-weight").forEach(el => el.addEventListener("input", e => { sessionSets[e.target.dataset.idx].weight = e.target.value; }));
  wrap.querySelectorAll(".set-reps").forEach(el => el.addEventListener("input", e => { sessionSets[e.target.dataset.idx].reps = e.target.value; }));
  wrap.querySelectorAll(".set-rpe").forEach(el => el.addEventListener("input", e => { sessionSets[e.target.dataset.idx].rpe = e.target.value; }));
  wrap.querySelectorAll(".set-remove-btn").forEach(el => el.addEventListener("click", (e) => {
    const idx = parseInt(e.currentTarget.dataset.idx);
    if (sessionSets.length > 1) {
      sessionSets.splice(idx, 1);
      renderSetRows();
    }
  }));
}

document.getElementById("addSetRowBtn").addEventListener("click", () => {
  // Convenience: most lifters repeat the same weight across sets in a session,
  // so prefill the new row with the previous set's weight.
  const last = sessionSets[sessionSets.length - 1];
  sessionSets.push({ weight: last ? last.weight : "", reps: "", rpe: "" });
  renderSetRows();
});

document.getElementById("openLogBtn").addEventListener("click", () => {
  document.getElementById("lDate").value = todayIso();
  if (selectedExerciseId) document.getElementById("lExercise").value = selectedExerciseId;
  sessionSets = [{ weight: "", reps: "", rpe: "" }];
  renderSetRows();
  formCard.style.display = formCard.style.display === "none" ? "block" : "none";
});
document.getElementById("lCancelBtn").addEventListener("click", () => formCard.style.display = "none");

document.getElementById("addExerciseBtn").addEventListener("click", () => {
  addExerciseCard.style.display = addExerciseCard.style.display === "none" ? "block" : "none";
});
document.getElementById("cancelExerciseBtn").addEventListener("click", () => addExerciseCard.style.display = "none");

document.getElementById("saveExerciseBtn").addEventListener("click", async () => {
  const name = document.getElementById("newExName").value.trim();
  if (!name) { showToast("Give the exercise a name."); return; }
  try {
    const ex = await Api.createExercise({
      name,
      category: document.getElementById("newExCategory").value,
      muscle_group: document.getElementById("newExMuscle").value.trim() || null,
    });
    showToast(`${ex.name} added.`);
    addExerciseCard.style.display = "none";
    document.getElementById("newExName").value = "";
    document.getElementById("newExMuscle").value = "";
    await loadExercises(ex.id);
  } catch (err) {
    handleApiError(err);
  }
});

document.getElementById("liftForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("lSubmitBtn");

  const sets = sessionSets.map(s => ({
    weight_kg: parseFloat(s.weight),
    reps: parseInt(s.reps),
    rpe: s.rpe !== "" && s.rpe !== null && s.rpe !== undefined ? parseFloat(s.rpe) : null,
  }));
  if (sets.some(s => isNaN(s.weight_kg) || isNaN(s.reps))) {
    showToast("Fill in weight and reps for every set.");
    return;
  }

  btn.disabled = true; btn.textContent = "Saving…";
  try {
    const exId = parseInt(document.getElementById("lExercise").value);
    await Api.logLiftSession({
      exercise_id: exId,
      date: document.getElementById("lDate").value,
      notes: document.getElementById("lNotes").value || null,
      sets,
    });
    showToast(sets.length > 1 ? `${sets.length} sets logged.` : "Set logged.");
    document.getElementById("liftForm").reset();
    formCard.style.display = "none";
    selectedExerciseId = exId;
    document.getElementById("exerciseSelect").value = exId;
    localStorage.setItem("ironlog_last_exercise", exId);
    await Promise.all([loadProgress(exId), loadPRTable()]);
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.textContent = "Save session";
  }
});

document.getElementById("exerciseSelect").addEventListener("change", (e) => {
  selectedExerciseId = parseInt(e.target.value);
  localStorage.setItem("ironlog_last_exercise", selectedExerciseId);
  loadProgress(selectedExerciseId);
});

async function deleteLiftLog(id) {
  if (!confirm("Delete this set?")) return;
  try {
    await Api.deleteLift(id);
    showToast("Set deleted.");
    await Promise.all([loadProgress(selectedExerciseId), loadPRTable()]);
  } catch (err) {
    handleApiError(err);
  }
}
window.deleteLiftLog = deleteLiftLog;

async function loadExercises(preferId) {
  exercises = await Api.listExercises();
  const select = document.getElementById("exerciseSelect");
  const formSelect = document.getElementById("lExercise");
  const optionsHtml = buildGroupedExerciseOptions(exercises);
  select.innerHTML = optionsHtml;
  formSelect.innerHTML = optionsHtml;

  if (!exercises.length) return;
  const target = preferId || (exercises.some(e => e.id === selectedExerciseId) ? selectedExerciseId : exercises[0].id);
  selectedExerciseId = target;
  select.value = target;
  formSelect.value = target;
  await loadProgress(target);
}

const STRENGTH_LEVEL_BADGE = {
  beginner: "badge-grey", novice: "badge-blue", intermediate: "badge-blue",
  advanced: "badge-green", elite: "badge-gold",
};

async function loadProgress(exerciseId) {
  const section = document.getElementById("progressSection");
  section.innerHTML = `<div class="loading-block"><div class="spinner"></div> Loading progress…</div>`;
  try {
    const progress = await Api.liftProgress(exerciseId);
    if (!progress.has_data) {
      section.innerHTML = `<div class="card"><div class="empty-state"><p>No sets logged for ${escapeHtml(progress.exercise)} yet. Log one above to start tracking 1RM trend.</p></div></div>`;
      return;
    }

    const changeDelta = fmtDelta(progress.change_pct, "%");
    const levelBadge = progress.approximate_strength_level
      ? `<span class="badge ${STRENGTH_LEVEL_BADGE[progress.approximate_strength_level] || "badge-grey"}">${progress.approximate_strength_level}</span>`
      : "";

    section.innerHTML = `
      <div class="grid grid-stats mb-16">
        <div class="card stat-card">
          <div class="stat-label">Latest est. 1RM</div>
          <div class="stat-value">${fmtKg(progress.latest_session_1rm_kg)}<span class="unit">kg</span></div>
          <div class="stat-delta ${changeDelta.cls}">${changeDelta.text} since first log</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Personal record</div>
          <div class="stat-value">${fmtKg(progress.personal_record_1rm_kg)}<span class="unit">kg</span></div>
          <div class="stat-delta neutral">${fmtDate(progress.personal_record_date)}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Strength level</div>
          <div class="stat-value" style="font-size:18px;">${levelBadge || '<span class="text-tertiary" style="font-size:13px;">Add bodyweight + profile</span>'}</div>
          <div class="stat-delta neutral">Approximate, bodyweight ratio based</div>
        </div>
      </div>
      <div class="card mb-16">
        <div class="card-title flex gap-8" style="align-items:center;">
          <span>${escapeHtml(progress.exercise)} — estimated 1RM over time</span>
          ${progress.muscle_group ? `<span class="badge badge-grey">${escapeHtml(capitalize(progress.muscle_group))}</span>` : ""}
        </div>
        <canvas id="liftCanvas" height="85"></canvas>
      </div>
      <div class="card">
        <div class="card-title">Sessions</div>
        <div id="liftTableWrap"></div>
      </div>
    `;

    renderLiftChart(progress.series);
    renderLiftTable(exerciseId);
  } catch (err) {
    handleApiError(err);
    section.innerHTML = `<div class="card"><p class="text-secondary">Couldn't load progress.</p></div>`;
  }
}

function renderLiftChart(series) {
  const ctx = document.getElementById("liftCanvas");
  if (liftChart) liftChart.destroy();
  liftChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map(s => fmtDate(s.date)),
      datasets: [{
        label: "Estimated 1RM (kg)",
        data: series.map(s => s.estimated_1rm_kg),
        borderColor: "#E2402D",
        backgroundColor: "rgba(226,64,45,0.08)",
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: "#E2402D",
        borderWidth: 2,
        tension: 0.25,
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
}

async function renderLiftTable(exerciseId) {
  const wrap = document.getElementById("liftTableWrap");
  const logs = await Api.listLifts({ exercise_id: exerciseId });
  if (!logs.length) {
    wrap.innerHTML = `<div class="empty-state"><p>No sets logged yet.</p></div>`;
    return;
  }
  const rows = [...logs].reverse().map(l => `
    <tr>
      <td class="label-cell">${fmtDate(l.date)}</td>
      <td>${l.set_number ? `#${l.set_number}` : "—"}</td>
      <td>${fmtKg(l.weight_kg)} kg</td>
      <td>${l.reps}</td>
      <td>${l.rpe ?? "—"}</td>
      <td class="label-cell text-secondary">${l.notes || ""}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" onclick="deleteLiftLog(${l.id})" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Date</th><th>Set</th><th>Weight</th><th>Reps</th><th>RPE</th><th>Notes</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadPRTable() {
  const wrap = document.getElementById("prTableWrap");
  const prs = await Api.personalRecords();
  if (!prs.length) {
    wrap.innerHTML = `<div class="empty-state"><p>Log sets across exercises to build your PR board.</p></div>`;
    return;
  }
  const rows = prs.map(p => `
    <tr>
      <td class="label-cell">
        <div class="flex gap-8" style="align-items:center;">
          <span>${escapeHtml(p.exercise)}</span>
          ${p.muscle_group ? `<span class="badge badge-grey">${escapeHtml(capitalize(p.muscle_group))}</span>` : ""}
        </div>
      </td>
      <td>${fmtKg(p.estimated_1rm_kg)} kg</td>
      <td>${fmtKg(p.achieved_with.weight_kg)} kg × ${p.achieved_with.reps}</td>
      <td class="text-secondary">${fmtDate(p.date)}</td>
    </tr>
  `).join("");
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Exercise</th><th>Est. 1RM</th><th>Achieved with</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

(async function init() {
  await loadExercises(selectedExerciseId);
  await loadPRTable();
})();