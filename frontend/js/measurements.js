renderShell("measurements", "Body Measurements", "Track tape measurements and see visual trends.");

let measurementChart = null;

function chartColors() {
  const isDark = !document.documentElement.getAttribute('data-theme') ||
                  document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    tick:   isDark ? '#6b7280' : '#78716c',
    tickY:  isDark ? '#9ca5ac' : '#57534e',
    grid:   isDark ? 'rgba(242,240,234,0.05)' : 'rgba(0,0,0,0.06)',
    legend: isDark ? '#9ca5ac' : '#57534e',
  };
}

document.getElementById("pageHeaderActions").innerHTML = `
  <div style="display:flex; align-items:center; gap: 12px;">
    <div style="display:flex; background:var(--surface-50); border-radius:6px; padding:2px; font-size:13px; font-weight:600;">
      <button id="unitBtnCm" class="btn btn-sm" style="background:var(--surface-0); border-radius:4px; border:1px solid var(--border-color); padding:4px 12px; cursor:pointer; color:var(--text-primary);">cm</button>
      <button id="unitBtnIn" class="btn btn-sm" style="background:transparent; border:none; padding:4px 12px; cursor:pointer; color:var(--text-tertiary);">in</button>
    </div>
    <button class="btn btn-primary btn-sm" id="openLogBtn">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      Log measurements
    </button>
  </div>
`;

document.getElementById("pageContent").innerHTML = `
  <div id="formCard" class="card mb-16" style="display:none;">
    <div class="card-title">Log measurements (<span id="formUnitLabel">cm</span>)</div>
    <form id="measurementForm">
      <div class="form-row">
        <div class="field">
          <label for="mDate">Date</label>
          <input type="date" id="mDate" required>
        </div>
        <div class="field">
          <label for="mChest">Chest</label>
          <input type="number" id="mChest" step="0.1" min="0" max="300" placeholder="e.g. 102.5">
        </div>
        <div class="field">
          <label for="mWaist">Waist</label>
          <input type="number" id="mWaist" step="0.1" min="0" max="300" placeholder="e.g. 85.0">
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="mNeck">Neck</label>
          <input type="number" id="mNeck" step="0.1" min="0" max="300" placeholder="e.g. 40.5">
        </div>
        <div class="field">
          <label for="mHip">Hip</label>
          <input type="number" id="mHip" step="0.1" min="0" max="300">
        </div>
        <div class="field">
          <label for="mArm">Arm</label>
          <input type="number" id="mArm" step="0.1" min="0" max="300">
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="mForearm">Forearm</label>
          <input type="number" id="mForearm" step="0.1" min="0" max="300">
        </div>
        <div class="field">
          <label for="mThigh">Thigh</label>
          <input type="number" id="mThigh" step="0.1" min="0" max="300">
        </div>
        <div class="field">
          <label for="mCalf">Calf</label>
          <input type="number" id="mCalf" step="0.1" min="0" max="300">
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label for="mShoulders">Shoulders</label>
          <input type="number" id="mShoulders" step="0.1" min="0" max="300">
        </div>
      </div>
      <div class="field">
        <label for="mNotes">Notes <span class="text-tertiary">(optional)</span></label>
        <input type="text" id="mNotes" placeholder="e.g. morning, unflexed">
      </div>
      <div class="flex gap-12">
        <button type="submit" class="btn btn-primary" id="mSubmitBtn">Save entry</button>
        <button type="button" class="btn btn-ghost" id="mCancelBtn">Cancel</button>
      </div>
    </form>
  </div>

  <div class="card mb-16">
    <div class="flex-between mb-16">
      <div class="card-title" style="margin:0;">Trend</div>
      <select id="chartMetric" class="form-control" style="width: auto; padding: 4px 12px; height: 32px; font-size: 0.9rem;">
        <option value="chest">Chest</option>
        <option value="waist">Waist</option>
        <option value="neck">Neck</option>
        <option value="hip">Hip</option>
        <option value="arm">Arm</option>
        <option value="forearm">Forearm</option>
        <option value="thigh">Thigh</option>
        <option value="calf">Calf</option>
        <option value="shoulders">Shoulders</option>
      </select>
    </div>
    <div style="position: relative; height: 300px; width: 100%;">
      <canvas id="measurementCanvas"></canvas>
    </div>
  </div>

  <div class="card">
    <div class="card-title">History</div>
    <div class="table-wrapper">
      <table class="data-table" style="width:100%">
        <thead>
          <tr>
            <th>Date</th>
            <th>Chest</th>
            <th>Waist</th>
            <th>Arm</th>
            <th>Thigh</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="mTableBody">
          <tr><td colspan="7" style="text-align:center;padding:24px;">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
`;

let currentLogs = [];
let displayUnit = localStorage.getItem("ironlog_measurements_unit") || "cm";

function getVal(log, metric) {
  if (log[metric] === null || log[metric] === undefined) return null;
  let val = log[metric];
  // Convert based on log.unit vs displayUnit
  const logUnit = log.unit || "cm";
  if (logUnit === "cm" && displayUnit === "in") val = val / 2.54;
  if (logUnit === "in" && displayUnit === "cm") val = val * 2.54;
  return Number(val.toFixed(1));
}

function updateUnitUI() {
  document.getElementById("formUnitLabel").textContent = displayUnit;
  document.getElementById("unitBtnCm").style.background = displayUnit === "cm" ? "var(--surface-0)" : "transparent";
  document.getElementById("unitBtnCm").style.color = displayUnit === "cm" ? "var(--text-primary)" : "var(--text-tertiary)";
  document.getElementById("unitBtnCm").style.border = displayUnit === "cm" ? "1px solid var(--border-color)" : "none";
  
  document.getElementById("unitBtnIn").style.background = displayUnit === "in" ? "var(--surface-0)" : "transparent";
  document.getElementById("unitBtnIn").style.color = displayUnit === "in" ? "var(--text-primary)" : "var(--text-tertiary)";
  document.getElementById("unitBtnIn").style.border = displayUnit === "in" ? "1px solid var(--border-color)" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openLogBtn");
  const cancelBtn = document.getElementById("mCancelBtn");
  const formCard = document.getElementById("formCard");
  const form = document.getElementById("measurementForm");
  const metricSelect = document.getElementById("chartMetric");
  
  const btnCm = document.getElementById("unitBtnCm");
  const btnIn = document.getElementById("unitBtnIn");
  
  updateUnitUI();

  btnCm.addEventListener("click", () => {
    if (displayUnit === "cm") return;
    displayUnit = "cm";
    localStorage.setItem("ironlog_measurements_unit", "cm");
    updateUnitUI();
    renderTable(currentLogs);
    renderChart(currentLogs);
  });

  btnIn.addEventListener("click", () => {
    if (displayUnit === "in") return;
    displayUnit = "in";
    localStorage.setItem("ironlog_measurements_unit", "in");
    updateUnitUI();
    renderTable(currentLogs);
    renderChart(currentLogs);
  });

  document.getElementById("mDate").value = new Date().toISOString().split("T")[0];

  openBtn.addEventListener("click", () => {
    formCard.style.display = "flex";
    document.getElementById("mChest").focus();
  });

  cancelBtn.addEventListener("click", () => {
    formCard.style.display = "none";
    form.reset();
    document.getElementById("mDate").value = new Date().toISOString().split("T")[0];
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("mSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";
    
    const payload = {
      date: document.getElementById("mDate").value,
      chest: parseFloat(document.getElementById("mChest").value) || null,
      waist: parseFloat(document.getElementById("mWaist").value) || null,
      neck: parseFloat(document.getElementById("mNeck").value) || null,
      hip: parseFloat(document.getElementById("mHip").value) || null,
      arm: parseFloat(document.getElementById("mArm").value) || null,
      forearm: parseFloat(document.getElementById("mForearm").value) || null,
      thigh: parseFloat(document.getElementById("mThigh").value) || null,
      calf: parseFloat(document.getElementById("mCalf").value) || null,
      shoulders: parseFloat(document.getElementById("mShoulders").value) || null,
      notes: document.getElementById("mNotes").value || null,
      unit: displayUnit,
    };

    try {
      await Api.measurementsAdd(payload);
      form.reset();
      document.getElementById("mDate").value = new Date().toISOString().split("T")[0];
      formCard.style.display = "none";
      await loadData();
    } catch (err) {
      handleApiError(err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save entry";
    }
  });

  metricSelect.addEventListener("change", () => {
    renderChart(currentLogs);
  });

  loadData();
});

async function loadData() {
  try {
    const logs = await Api.measurementsGet();
    currentLogs = logs;
    renderTable(logs);
    renderChart(logs);
    if (typeof window.hideLoading === "function") window.hideLoading();
  } catch (err) {
    handleApiError(err);
  }
}

function renderTable(logs) {
  const tbody = document.getElementById("mTableBody");
  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;">No measurements logged yet.</td></tr>';
    return;
  }
  
  // reverse so newest is on top
  const sorted = [...logs].reverse();
  
  let html = "";
  for (const log of sorted) {
    html += `
      <tr>
        <td><strong>${fmtDate(log.date)}</strong></td>
        <td>${getVal(log, 'chest') ? getVal(log, 'chest') + ' ' + displayUnit : '-'}</td>
        <td>${getVal(log, 'waist') ? getVal(log, 'waist') + ' ' + displayUnit : '-'}</td>
        <td>${getVal(log, 'arm') ? getVal(log, 'arm') + ' ' + displayUnit : '-'}</td>
        <td>${getVal(log, 'thigh') ? getVal(log, 'thigh') + ' ' + displayUnit : '-'}</td>
        <td class="text-tertiary" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${log.notes || ''}
        </td>
        <td style="text-align:right;">
          <button class="btn btn-ghost btn-sm text-danger" onclick="deleteMeasurement(${log.id})">Delete</button>
        </td>
      </tr>
    `;
  }
  tbody.innerHTML = html;
}

window.deleteMeasurement = async function(id) {
  const ok = await window.appConfirm("Delete entry", "Are you sure you want to delete this measurement log?", "Delete", "Cancel");
  if (!ok) return;
  try {
    await Api.measurementsDelete(id);
    await loadData();
  } catch (err) {
    handleApiError(err);
  }
};

function renderChart(logs) {
  if (measurementChart) {
    measurementChart.destroy();
  }
  
  const metric = document.getElementById("chartMetric").value;
  
  // filter logs that have this metric
  const validLogs = logs.filter(l => l[metric] !== null && l[metric] !== undefined);
  
  if (validLogs.length === 0) {
    // just draw empty canvas if no data for metric
    return;
  }
  
  const labels = validLogs.map(l => {
    const d = new Date(l.date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  // use getVal so it matches displayUnit
  const data = validLogs.map(l => getVal(l, metric));
  
  const ctx = document.getElementById('measurementCanvas').getContext('2d');
  const colors = chartColors();
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(192, 57, 43, 0.2)');
  gradient.addColorStop(1, 'rgba(192, 57, 43, 0)');

  measurementChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: capitalize(metric) + ' (' + displayUnit + ')',
        data: data,
        borderColor: '#c0392b',
        backgroundColor: gradient,
        borderWidth: 2,
        pointBackgroundColor: '#c0392b',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleFont: { size: 13, family: 'Inter' },
          bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(ctx) { return ctx.parsed.y + ' ' + displayUnit; }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.tick, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: colors.grid, drawBorder: false },
          ticks: { color: colors.tickY, font: { family: 'Inter', size: 11 }, padding: 8 }
        }
      },
      interaction: { intersect: false, mode: 'index' },
    }
  });
}
