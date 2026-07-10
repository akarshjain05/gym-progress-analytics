renderShell("nutrition", "Nutrition", "Calories vs. your real maintenance, not just a formula.");

let calorieChart = null;

document.getElementById("pageHeaderActions").innerHTML = `
  <button class="btn btn-primary btn-sm" id="openLogBtn">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    Log calories
  </button>
`;

document.getElementById("pageContent").innerHTML = `
  <div id="formCard" class="card mb-16" style="display:none;">
    <div class="card-title">Log today's intake</div>
    <form id="calForm">
      <div class="form-row">
        <div class="field"><label for="cDate">Date</label><input type="date" id="cDate" required></div>
        <div class="field"><label for="cCalories">Calories</label><input type="number" id="cCalories" min="0" step="1" required placeholder="e.g. 2400"></div>
        <div class="field"><label for="cProtein">Protein (g)</label><input type="number" id="cProtein" min="0" step="1" placeholder="optional"></div>
        <div class="field"><label for="cCarbs">Carbs (g)</label><input type="number" id="cCarbs" min="0" step="1" placeholder="optional"></div>
        <div class="field"><label for="cFats">Fats (g)</label><input type="number" id="cFats" min="0" step="1" placeholder="optional"></div>
      </div>
      <div class="field"><label for="cNotes">Notes <span class="text-tertiary">(optional)</span></label><input id="cNotes" placeholder="e.g. refeed day"></div>
      <div class="flex gap-12">
        <button type="submit" class="btn btn-primary" id="cSubmitBtn">Save entry</button>
        <button type="button" class="btn btn-ghost" id="cCancelBtn">Cancel</button>
      </div>
    </form>
  </div>

  <div class="grid grid-stats mb-16" id="nutritionStats"></div>

  <div class="card mb-16" id="tdeeExplainerCard" style="display:none;">
    <div class="card-title">What's the difference?</div>
    <p class="text-secondary" style="font-size:13px;line-height:1.6;">
      <strong style="color:var(--text-primary);">Formula TDEE</strong> comes from the Mifflin-St Jeor equation using your profile (age, height, weight, activity level) — a population-average estimate.
      <strong style="color:var(--text-primary);">Your actual maintenance</strong> is back-calculated from your own logged calories and real weight change, so it reflects your actual metabolism instead of an average. Trust the actual number more once you have a few weeks of consistent logging.
    </p>
  </div>

  <div class="card mb-16">
    <div class="card-title">Calories logged</div>
    <canvas id="calorieCanvas" height="85"></canvas>
  </div>

  <div class="card">
    <div class="card-title">History</div>
    <div id="calTableWrap"></div>
  </div>
`;

const formCard = document.getElementById("formCard");
document.getElementById("openLogBtn").addEventListener("click", () => {
  document.getElementById("cDate").value = todayIso();
  formCard.style.display = formCard.style.display === "none" ? "block" : "none";
});
document.getElementById("cCancelBtn").addEventListener("click", () => formCard.style.display = "none");

document.getElementById("calForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("cSubmitBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    await Api.logCalories({
      date: document.getElementById("cDate").value,
      calories: parseFloat(document.getElementById("cCalories").value),
      protein_g: document.getElementById("cProtein").value ? parseFloat(document.getElementById("cProtein").value) : null,
      carbs_g: document.getElementById("cCarbs").value ? parseFloat(document.getElementById("cCarbs").value) : null,
      fats_g: document.getElementById("cFats").value ? parseFloat(document.getElementById("cFats").value) : null,
      notes: document.getElementById("cNotes").value || null,
    });
    showToast("Calories logged.");
    document.getElementById("calForm").reset();
    formCard.style.display = "none";
    await loadAll();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.textContent = "Save entry";
  }
});

async function deleteCalEntry(id) {
  if (!confirm("Delete this entry?")) return;
  try {
    await Api.deleteCalorieLog(id);
    showToast("Entry deleted.");
    await loadAll();
  } catch (err) {
    handleApiError(err);
  }
}
window.deleteCalEntry = deleteCalEntry;

function renderStats(summary) {
  const el = document.getElementById("nutritionStats");
  const explainer = document.getElementById("tdeeExplainerCard");

  if (!summary.has_calorie_data) {
    el.innerHTML = buildEmptyState(
      "No calories logged",
      "Log a few days to see your trend and TDEE estimate.",
      "Log calories now",
      "#"
    );
    explainer.style.display = "none";
    setTimeout(() => {
      const btn = el.querySelector('.btn-primary');
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('openLogBtn').click(); });
    }, 0);
    return;
  }

  explainer.style.display = (summary.formula_tdee_kcal || summary.actual_tdee_estimate_kcal) ? "block" : "none";

  el.innerHTML = `
    <div class="card stat-card">
      <div class="stat-label">Avg (7 days)</div>
      <div class="stat-value">${Math.round(summary.avg_calories_last_7_days)}<span class="unit">kcal</span></div>
      <div class="stat-delta neutral">All-time avg: ${Math.round(summary.avg_calories_all_time)}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Formula TDEE</div>
      <div class="stat-value">${summary.formula_tdee_kcal ? Math.round(summary.formula_tdee_kcal) : "—"}<span class="unit">kcal</span></div>
      <div class="stat-delta neutral">${summary.formula_tdee_kcal ? `BMR ${Math.round(summary.formula_bmr_kcal)}` : "Add age/height/gender in Profile"}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Your actual maintenance</div>
      <div class="stat-value">${summary.actual_tdee_estimate_kcal ? Math.round(summary.actual_tdee_estimate_kcal) : "—"}<span class="unit">kcal</span></div>
      <div class="stat-delta neutral">${summary.actual_tdee_estimate_kcal ? "from your real data" : `Needs 10+ days of overlapping logs (${summary.days_logged} so far)`}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Days logged</div>
      <div class="stat-value">${summary.days_logged}<span class="unit">days</span></div>
      <div class="stat-delta neutral">Total entries</div>
    </div>
  `;
}

function renderChart(series, formulaTdee, actualTdee) {
  const ctx = document.getElementById("calorieCanvas");
  const labels = series.map(s => fmtDate(s.date));
  const datasets = [{
    label: "Calories",
    data: series.map(s => s.calories),
    borderColor: "#4F9D69",
    backgroundColor: "rgba(79,157,105,0.08)",
    fill: true,
    pointRadius: 2,
    borderWidth: 1.5,
    tension: 0.2,
  }];
  const refLine = actualTdee || formulaTdee;
  if (refLine) {
    datasets.push({
      label: actualTdee ? "Your actual maintenance" : "Formula TDEE",
      data: series.map(() => refLine),
      borderColor: "#D4A33B",
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
    });
  }
  if (calorieChart) calorieChart.destroy();
  calorieChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#9CA5AC", boxWidth: 12, font: { family: "Inter", size: 11.5 } } } },
      scales: {
        x: { ticks: { color: "#6B7480", font: { size: 11 } }, grid: { color: "rgba(242,240,234,0.05)" } },
        y: { ticks: { color: "#6B7480", font: { size: 11 } }, grid: { color: "rgba(242,240,234,0.05)" } },
      },
    },
  });
}

function renderTable(logs) {
  const wrap = document.getElementById("calTableWrap");
  if (!logs.length) {
    wrap.innerHTML = `<div class="empty-state"><p>No entries yet.</p></div>`;
    return;
  }
  const rows = [...logs].reverse().map(l => `
    <tr>
      <td class="label-cell">${fmtDate(l.date)}</td>
      <td>${Math.round(l.calories)} kcal</td>
      <td>${l.protein_g ?? "—"}</td>
      <td>${l.carbs_g ?? "—"}</td>
      <td>${l.fats_g ?? "—"}</td>
      <td class="label-cell text-secondary">${l.notes || ""}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" onclick="deleteCalEntry(${l.id})" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Date</th><th>Calories</th><th>Protein</th><th>Carbs</th><th>Fats</th><th>Notes</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function loadAll() {
  try {
    const summary = await Api.nutritionSummary();
    renderStats(summary);
    if (summary.has_calorie_data) {
      renderChart(summary.series, summary.formula_tdee_kcal, summary.actual_tdee_estimate_kcal);
      const logs = await Api.listCalories();
      renderTable(logs);
    } else {
      document.getElementById("calorieCanvas").style.display = "none";
      renderTable([]);
    }
  } catch (err) {
    handleApiError(err);
  }
}

loadAll();
