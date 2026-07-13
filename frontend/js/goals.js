document.addEventListener("DOMContentLoaded", async () => {
  renderShell("goals", "Goals", "Track your progress across lifts, weight, nutrition, and more.");
  
  const container = document.getElementById("pageContent");
  container.innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Set a New Goal</div>
        <form id="goalForm" class="mb-16">
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

          <div class="field">
            <label for="gDate">Target Date (Optional)</label>
            <input type="date" id="gDate">
          </div>
          
          <button type="submit" class="btn btn-secondary btn-block">Set goal</button>
        </form>
      </div>

      <div>
        <div class="card mb-16">
          <div class="card-title">Active Goals</div>
          <div id="activeGoalsWrap">Loading...</div>
        </div>
        <div class="card">
          <div class="card-title">Completed Goals</div>
          <div id="completedGoalsWrap">Loading...</div>
        </div>
      </div>
    </div>
  `;

  // Bind type switching
  document.getElementById("gType").addEventListener("change", (e) => {
    document.querySelectorAll(".goal-type-fields").forEach(el => el.style.display = "none");
    document.getElementById(`fields-${e.target.value}`).style.display = "block";
  });

  // Load options & data
  await loadGoalExerciseOptions();
  await loadGoals();

  // Form submission
  document.getElementById("goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("gType").value;
    const payload = { goal_type: type, target_date: document.getElementById("gDate").value || null };
    
    if (type === "lift") {
      payload.exercise_id = parseInt(document.getElementById("gExercise").value);
      payload.target_weight_kg = parseFloat(document.getElementById("gWeight").value);
      payload.target_reps = parseInt(document.getElementById("gReps").value || "1");
      if (isNaN(payload.target_weight_kg)) return alert("Please enter target weight.");
    } else if (type === "weight") {
      payload.target_body_weight_kg = parseFloat(document.getElementById("gBodyWeight").value);
      if (isNaN(payload.target_body_weight_kg)) return alert("Please enter target body weight.");
    } else if (type === "nutrition") {
      payload.target_calories = parseFloat(document.getElementById("gCalories").value) || null;
      payload.target_protein_g = parseFloat(document.getElementById("gProtein").value) || null;
      if (!payload.target_calories && !payload.target_protein_g) return alert("Please enter calories or protein.");
    } else if (type === "frequency") {
      payload.target_workouts_per_week = parseInt(document.getElementById("gFrequency").value);
      if (isNaN(payload.target_workouts_per_week)) return alert("Please enter target workouts per week.");
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
      
      await loadGoals();
    } catch (err) {
      handleApiError(err);
    }
  });
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

async function loadGoals() {
  try {
    const goals = await Api.listGoals();
    const activeWrap = document.getElementById("activeGoalsWrap");
    const completedWrap = document.getElementById("completedGoalsWrap");
    
    const active = goals.filter(g => !g.is_completed);
    const completed = goals.filter(g => g.is_completed);
    
    activeWrap.innerHTML = active.length 
      ? active.map(g => renderGoalCard(g, false)).join("") 
      : `<div class="empty-state"><p>No active goals.</p></div>`;
      
    completedWrap.innerHTML = completed.length 
      ? completed.map(g => renderGoalCard(g, true)).join("") 
      : `<div class="empty-state"><p>No completed goals yet.</p></div>`;
      
  } catch (err) {
    handleApiError(err);
  }
}

function renderGoalCard(g, isCompleted) {
  let title = "";
  let subtitle = g.target_date ? `Target: ${fmtDate(g.target_date)}` : "No target date";
  let badge = `<span class="badge-goal badge-${g.goal_type}">${g.goal_type}</span>`;
  
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
      <label class="checkbox-wrapper" style="margin-bottom:0;">
        <input type="checkbox" onchange="toggleGoal(${g.id})" ${isCompleted ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
      <div class="goal-details">
        <div class="goal-title">${escapeHtml(title)}</div>
        <div class="goal-subtitle">${badge} • ${subtitle}</div>
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
    await loadGoals();
  } catch (err) {
    handleApiError(err);
  }
};

window.deleteGoal = async function(id) {
  if (!window.confirm("Are you sure you want to delete this goal?")) return;
  try {
    await Api.deleteGoal(id);
    showToast("Goal deleted");
    await loadGoals();
  } catch (err) {
    handleApiError(err);
  }
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
