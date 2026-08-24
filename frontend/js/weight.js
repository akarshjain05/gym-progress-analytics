renderShell("weight", "Body Weight", "Log daily and watch the trend, not the noise.");

let weightChart = null;



document.getElementById("pageHeaderActions").innerHTML = DOMPurify.sanitize(`
  <button class="btn btn-primary btn-sm" id="openLogBtn">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    Log weight
  </button>
`);

document.getElementById("pageContent").innerHTML = DOMPurify.sanitize(`
  <div id="formCard" class="wk-modal-overlay" style="display:none; z-index:9999;">
    <div class="wk-modal" style="max-width:500px;">
      <div class="wk-modal-header">
        <h2 style="margin:0; font-size:18px;">Log a weigh-in</h2>
      </div>
      <div class="wk-modal-body">
        <form id="weightForm">
          <div class="form-row">
            <div class="field">
              <label for="wDate">Date</label>
              <input type="date" id="wDate" class="form-control" required>
            </div>
            <div class="field">
              <label for="wWeight">Weight (<span class="display-unit"></span>)</label>
              <input type="number" id="wWeight" class="form-control" min="0" step="any" required placeholder="e.g. 82.5">
            </div>
            <div class="field">
              <label for="wBf">Body fat % <span class="text-tertiary">(optional)</span></label>
              <input type="number" id="wBf" class="form-control" min="0" step="any" placeholder="e.g. 18.5">
            </div>
          </div>
          <div class="field">
            <label for="wNotes">Notes <span class="text-tertiary">(optional)</span></label>
            <input type="text" id="wNotes" class="form-control" placeholder="e.g. after fasted cardio">
          </div>
          <div class="flex gap-12" style="margin-top:16px;">
            <button type="submit" class="btn btn-primary" id="wSubmitBtn">Save entry</button>
            <button type="button" class="btn btn-ghost" id="wCancelBtn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div class="grid grid-stats mb-16" id="summaryStats"></div>

  <div class="card mb-16">
    <div class="card-title">Trend</div>
    <canvas id="weightCanvas" height="90"></canvas>
  </div>

  <div class="card">
    <div class="card-title">History</div>
    <div id="weightTableWrap"></div>
  </div>
`);

const formCard = document.getElementById("formCard");
const openLogBtn = document.getElementById("openLogBtn");
const wCancelBtn = document.getElementById("wCancelBtn");
const weightForm = document.getElementById("weightForm");

openLogBtn.addEventListener("click", () => {
  document.getElementById("wDate").value = todayIso();
  formCard.style.display = formCard.style.display === "none" ? "flex" : "none";
});
wCancelBtn.addEventListener("click", () => formCard.style.display = "none");

weightForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("wSubmitBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    await Api.logWeight({
      date: document.getElementById("wDate").value,
      weight_kg: userUnitToKg(document.getElementById("wWeight").value),
      body_fat_pct: document.getElementById("wBf").value ? parseFloat(document.getElementById("wBf").value) : null,
      notes: document.getElementById("wNotes").value || null,
    });
    showToast("Weight logged.");
    weightForm.reset();
    formCard.style.display = "none";
    await loadAll();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.textContent = "Save entry";
  }
});

window.deleteEntry = async function(id) {
  const ok = await window.appConfirm("Delete Entry", "Delete this entry?", "Delete", "Cancel");
  if (!ok) return;
  try {
    await Api.deleteWeight(id);
    showToast("Entry deleted.");
    await loadAll();
    window.hideLoading && window.hideLoading();
  } catch (err) {
    handleApiError(err);
    window.hideLoading && window.hideLoading();
  }
}


function renderSummary(summary) {
  const el = document.getElementById("summaryStats");
  if (!summary.has_data) {
    el.innerHTML = DOMPurify.sanitize(buildEmptyState(
      "No entries yet",
      "Log your first weigh-in to start tracking your trend.",
      "Log weight now",
      "#"
    ));
    // Bind click to open the form
    setTimeout(() => {
      const btn = el.querySelector('.btn-primary');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById('openLogBtn').click();
        });
      }
    }, 0);
    return;
  }
  const totalDelta = fmtDelta(summary.total_change_kg, " " + getUserUnit());
  const weeklyDelta = fmtDelta(summary.weekly_rate_kg, " " + getUserUnit() + "/wk");
  el.innerHTML = DOMPurify.sanitize(`
    <div class="card stat-card">
      <div class="stat-label">Current</div>
      <div class="stat-value">${escapeHtml(fmtKg(summary.current_weight_kg))}<span class="unit">${escapeHtml(getUserUnit())}</span></div>
      <div class="stat-delta neutral">Started at ${escapeHtml(fmtKg(summary.starting_weight_kg))} ${escapeHtml(getUserUnit())}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Total change</div>
      <div class="stat-value" style="font-size:26px;">${escapeHtml(totalDelta.text)}</div>
      <div class="stat-delta ${escapeHtml(totalDelta.cls)}">${escapeHtml(summary.total_change_pct !== null ? summary.total_change_pct + "%" : "")}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Weekly rate <span class="text-tertiary" style="font-weight:400;">(28d)</span></div>
      <div class="stat-value" style="font-size:26px;">${escapeHtml(weeklyDelta.text)}</div>
      <div class="stat-delta neutral">${escapeHtml(summary.weekly_rate_kg === null ? "Need more recent data" : "based on trend, not last point")}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Goal</div>
      <div class="stat-value" style="font-size:26px;">${escapeHtml(summary.goal_weight_kg ? fmtKg(summary.goal_weight_kg) + " " + getUserUnit() : "Not set")}</div>
      <div class="stat-delta neutral">${escapeHtml(summary.estimated_days_to_goal ? `~${Math.round(summary.estimated_days_to_goal/7)} weeks at this pace` : (summary.goal_weight_kg ? "Can't project yet" : "Set one in Profile"))}</div>
    </div>
  `);
}

function renderChart(series) {
  const ctx = document.getElementById("weightCanvas");
  const labels = series.map(s => fmtDate(s.date));
  const weights = series.map(s => s.weight_kg);
  const sma = series.map(s => s.moving_avg_7d);

  if (weightChart) weightChart.destroy();
  weightChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Weight (" + getUserUnit() + ")",
          data: weights,
          borderColor: "#C9CCD1",
          backgroundColor: "rgba(201,204,209,0.06)",
          pointRadius: 2,
          borderWidth: 1.5,
          tension: 0.15,
        },
        {
          label: "Trailing avg (7 logs)",
          data: sma,
          borderColor: "#E2402D",
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: chartColors().legend, boxWidth: 12, font: { family: "Inter", size: 11.5 } } },
      },
      scales: {
        x: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { color: chartColors().grid } },
        y: { ticks: { color: chartColors().tick, font: { size: 11 } }, grid: { color: chartColors().grid } },
      },
    },
  });
}

function renderTable(logs) {
  window.renderDataTable("weightTableWrap", logs, [
    { label: "Date", className: "label-cell", render: l => escapeHtml(fmtDate(l.date)) },
    { label: "Weight (" + getUserUnit() + ")", render: l => `${escapeHtml(fmtKg(l.weight_kg))} kg` },
    { label: "Body fat", render: l => escapeHtml(l.body_fat_pct !== null && l.body_fat_pct !== undefined ? l.body_fat_pct + "%" : "—") },
    { label: "Notes", className: "label-cell text-secondary", render: l => escapeHtml(l.notes || "") }
  ], "deleteEntry");
}

async function loadAll() {
  try {
    const summary = await Api.weightSummary();
    renderSummary(summary);
    if (summary.has_data) {
      renderChart(summary.series);
      const logs = await Api.listWeight();
      renderTable(logs);
    } else {
      document.getElementById("weightCanvas").style.display = "none";
      renderTable([]);
    }
    window.hideLoading && window.hideLoading();
  } catch (err) {
    handleApiError(err);
    window.hideLoading && window.hideLoading();
  }
}

loadAll();