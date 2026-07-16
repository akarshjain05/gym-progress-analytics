document.addEventListener("DOMContentLoaded", async () => {
  renderShell("goals", "Goals", "Track your progress across lifts, weight, nutrition, and more.");
  
  document.getElementById("pageHeaderActions").innerHTML = `
    <div class="goals-header-actions">
      <select id="goalFilter" class="select-input" style="padding: 6px 32px 6px 12px !important; font-size: 14px !important; height: 36px !important; border-radius: 8px; width: auto !important;">
        <option value="all">All Goals</option>
        <option value="lift">Lift</option>
        <option value="weight">Body Weight</option>
        <option value="nutrition">Nutrition</option>
        <option value="frequency">Frequency</option>
      </select>
      <button class="btn btn-primary" id="openGoalBtn" style="height: 36px; padding: 0 16px; font-size: 14px; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="margin-right:6px;"><path d="M12 5v14M5 12h14"/></svg>
        Set Goal
      </button>
    </div>
  `;

  const container = document.getElementById("pageContent");
  container.innerHTML = `
    <div id="formCard" class="wk-modal-overlay" style="display:none; z-index: 9999;">
      <div class="wk-modal" style="max-width:500px;">
        <div class="wk-modal-header">
          <span class="wk-modal-title">Set a New Goal</span>
          <button type="button" class="wk-modal-close" id="closeGoalModalBtn">✕</button>
        </div>
        <div class="wk-modal-body">
          <form id="goalForm">
            <div class="field">
              <label for="gType">Goal Type</label>
              <select id="gType" required>
                <option value="lift">Lift Goal</option>
                <option value="weight">Body Weight</option>
                <option value="nutrition">Nutrition</option>
                <option value="frequency">Workout Frequency</option>
              </select>
            </div>
            
            <div id="fields-lift" class="goal-type-fields">
              <div class="field">
                <label for="gExercise">Exercise</label>
                <select id="gExercise"></select>
              </div>
              <div class="form-row">
                <div class="field"><label for="gWeight">Target weight (kg)</label><input type="number" id="gWeight" min="1" step="0.5" placeholder="e.g. 120"></div>
                <div class="field"><label for="gReps">At reps</label><input type="number" id="gReps" min="1" value="1"></div>
              </div>
            </div>
            
            <div id="fields-weight" class="goal-type-fields" style="display:none;">
              <div class="field">
                <label for="gBodyWeight">Target body weight (kg)</label>
                <input type="number" id="gBodyWeight" min="1" step="0.5" placeholder="e.g. 75">
              </div>
            </div>

            <div id="fields-nutrition" class="goal-type-fields" style="display:none;">
              <div class="form-row">
                <div class="field"><label for="gCalories">Daily Calories</label><input type="number" id="gCalories" min="1" placeholder="e.g. 2500"></div>
                <div class="field"><label for="gProtein">Daily Protein (g)</label><input type="number" id="gProtein" min="1" placeholder="e.g. 150"></div>
              </div>
            </div>
            
            <div id="fields-frequency" class="goal-type-fields" style="display:none;">
              <div class="field">
                <label for="gFrequency">Workouts per week</label>
                <input type="number" id="gFrequency" min="1" max="14" placeholder="e.g. 4">
              </div>
            </div>

            <div class="field" style="margin-bottom:0;">
              <label for="gDate">Target Date (Optional)</label>
              <input type="date" id="gDate">
            </div>
          </form>
        </div>
        <div class="wk-modal-footer" style="display:flex; justify-content:flex-end; gap:12px;">
          <button type="button" class="btn btn-ghost" id="gCancelBtn">Cancel</button>
          <button type="submit" form="goalForm" class="btn btn-primary" id="gSubmitBtn">Save Goal</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-12 mb-16">
      <div class="tabs" style="margin-bottom:0; width: 100%; display: flex; padding: 4px; box-sizing: border-box;">
        <button class="tab active" data-tab="active" style="flex: 1; text-align: center;">Active</button>
        <button class="tab" data-tab="completed" style="flex: 1; text-align: center;">Completed</button>
      </div>
    </div>

    <div id="goalsWrap">
      <div class="empty-state"><p>Loading...</p></div>
    </div>
  `;

  let currentTab = "active";
  let allGoalsData = [];

  const formCard = document.getElementById("formCard");
  document.getElementById("openGoalBtn").addEventListener("click", () => {
    formCard.style.display = formCard.style.display === "none" || formCard.style.display === "" ? "flex" : "none";
  });
  document.getElementById("gCancelBtn").addEventListener("click", () => {
    formCard.style.display = "none";
  });
  document.getElementById("closeGoalModalBtn").addEventListener("click", () => {
    formCard.style.display = "none";
  });

  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");
      currentTab = e.target.dataset.tab;
      renderFilteredGoals();
    });
  });

  document.getElementById("goalFilter").addEventListener("change", () => {
    renderFilteredGoals();
  });

  // Bind type switching for the form
  document.getElementById("gType").addEventListener("change", (e) => {
    document.querySelectorAll(".goal-type-fields").forEach(el => el.style.display = "none");
    document.getElementById(`fields-${e.target.value}`).style.display = "block";
  });

  await loadGoalExerciseOptions();
  await loadGoals();

  // Form submission
  document.getElementById("goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("gSubmitBtn");
    btn.disabled = true; btn.textContent = "Saving...";
    
    const type = document.getElementById("gType").value;
    const payload = { goal_type: type, target_date: document.getElementById("gDate").value || null };
    
    if (type === "lift") {
      payload.exercise_id = parseInt(document.getElementById("gExercise").value);
      payload.target_weight_kg = parseFloat(document.getElementById("gWeight").value);
      payload.target_reps = parseInt(document.getElementById("gReps").value || "1");
      if (isNaN(payload.target_weight_kg)) { btn.disabled = false; btn.textContent = "Save Goal"; await window.appAlert("Validation Error", "Please enter target weight."); return; }
    } else if (type === "weight") {
      payload.target_body_weight_kg = parseFloat(document.getElementById("gBodyWeight").value);
      if (isNaN(payload.target_body_weight_kg)) { btn.disabled = false; btn.textContent = "Save Goal"; await window.appAlert("Validation Error", "Please enter target body weight."); return; }
    } else if (type === "nutrition") {
      payload.target_calories = parseFloat(document.getElementById("gCalories").value) || null;
      payload.target_protein_g = parseFloat(document.getElementById("gProtein").value) || null;
      if (!payload.target_calories && !payload.target_protein_g) { btn.disabled = false; btn.textContent = "Save Goal"; await window.appAlert("Validation Error", "Please enter calories or protein."); return; }
    } else if (type === "frequency") {
      payload.target_workouts_per_week = parseInt(document.getElementById("gFrequency").value);
      if (isNaN(payload.target_workouts_per_week)) { btn.disabled = false; btn.textContent = "Save Goal"; await window.appAlert("Validation Error", "Please enter target workouts per week."); return; }
    }

    try {
      await Api.setGoal(payload);
      showToast("Goal created successfully!", "success");
      
      // Reset form
      document.getElementById("gWeight").value = "";
      document.getElementById("gBodyWeight").value = "";
      document.getElementById("gCalories").value = "";
      document.getElementById("gProtein").value = "";
      document.getElementById("gFrequency").value = "";
      document.getElementById("gDate").value = "";
      
      formCard.style.display = "none";
      await loadGoals();
    } catch (err) {
      handleApiError(err);
    } finally {
      btn.disabled = false; btn.textContent = "Save Goal";
    }
  });

  async function loadGoals() {
    try {
      allGoalsData = await Api.listGoals();
      renderFilteredGoals();
    } catch (err) {
      handleApiError(err);
    }
  }

  window.loadGoals = loadGoals; // expose for toggle/delete callbacks

  function renderFilteredGoals() {
    const filter = document.getElementById("goalFilter").value;
    let filtered = allGoalsData;
    
    if (currentTab === "active") {
      filtered = filtered.filter(g => !g.is_completed);
    } else {
      filtered = filtered.filter(g => g.is_completed);
    }

    if (filter !== "all") {
      filtered = filtered.filter(g => g.goal_type === filter);
    }

    const wrap = document.getElementById("goalsWrap");
    if (!filtered.length) {
      wrap.className = "";
      wrap.style.padding = "";
      wrap.innerHTML = `<div class="empty-state" style="padding: 64px 20px;">
        <p style="font-size: 15px; color: var(--text-secondary); margin: 0;">No ${currentTab} goals found.</p>
      </div>`;
      return;
    }

    wrap.className = "card";
    wrap.style.padding = "0";
    wrap.innerHTML = filtered.map(g => renderGoalCard(g, g.is_completed)).join("");
  }
});

let exerciseMap = {};

async function loadGoalExerciseOptions() {
  try {
    const exercises = await Api.listExercises();
    exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e.name]));
    document.getElementById("gExercise").innerHTML = buildGroupedExerciseOptions(exercises);
  } catch (err) {
    console.error("Failed to load exercises", err);
  }
}

function renderGoalCard(g, isCompleted) {
  let title = "";
  let badge = `<span class="badge-goal badge-${g.goal_type}">${g.goal_type}</span>`;
  let subtitleHTML = g.target_date ? `${badge} &bull; Target: ${fmtDate(g.target_date)}` : badge;
  
  if (g.goal_type === "lift") {
    title = `${exerciseMap[g.exercise_id] || "Unknown Lift"}: ${fmtKg(g.target_weight_kg)} kg × ${g.target_reps}`;
  } else if (g.goal_type === "weight") {
    title = `Target Weight: ${fmtKg(g.target_body_weight_kg)} kg`;
  } else if (g.goal_type === "nutrition") {
    let parts = [];
    if (g.target_calories) parts.push(`${g.target_calories} kcal`);
    if (g.target_protein_g) parts.push(`${g.target_protein_g}g protein`);
    title = parts.join(" / ");
  } else if (g.goal_type === "frequency") {
    title = `${g.target_workouts_per_week} workouts per week`;
  }

  return `
    <div class="goal-card ${isCompleted ? 'goal-card-completed' : ''}">
      <input type="checkbox" class="goal-checkbox" onchange="toggleGoal(${g.id})" ${isCompleted ? 'checked' : ''}>
      <div class="goal-details">
        <div class="goal-title">${escapeHtml(title)}</div>
        <div class="goal-subtitle">${subtitleHTML}</div>
      </div>
      <div class="goal-actions">
        <button class="icon-btn icon-btn-danger" onclick="deleteGoal(${g.id})" title="Delete Goal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

window.toggleGoal = async function(id) {
  try {
    await Api.toggleGoalCompletion(id);
    await window.loadGoals();
  } catch (err) {
    handleApiError(err);
  }
};

window.deleteGoal = async function(id) {
  const ok = await window.appConfirm("Delete Goal", "Are you sure you want to delete this goal?", "Delete", "Cancel");
  if (!ok) return;
  try {
    await Api.deleteGoal(id);
    showToast("Goal deleted");
    await window.loadGoals();
  } catch (err) {
    handleApiError(err);
  }
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
