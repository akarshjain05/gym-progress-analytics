renderShell("profile", "Profile", "Your stats power the BMR/TDEE and strength-level calculations.");

document.getElementById("pageContent").innerHTML = `
  <!-- Tab bar -->
  <div class="profile-tabs">
    <button class="profile-tab active" data-tab="profile">👤 Profile</button>
    <button class="profile-tab" data-tab="settings">⚙️ Settings</button>
  </div>

  <!-- ── Tab: Profile ── -->
  <div id="tab-profile" class="profile-tab-content">
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Your stats</div>
        <form id="profileForm">
          <div class="form-row">
            <div class="field">
              <label for="pUsername">Username</label>
              <input id="pUsername" disabled>
            </div>
            <div class="field">
              <label for="pEmail">Email</label>
              <input id="pEmail" disabled>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="pGender">Gender</label>
              <select id="pGender">
                <option value="">Not set</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <span class="hint">Used for BMR formula & strength-level standards.</span>
            </div>
            <div class="field">
              <label for="pAge">Age</label>
              <input type="number" id="pAge" min="10" max="100" placeholder="e.g. 25">
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="pHeight">Height (cm)</label>
              <input type="number" id="pHeight" min="50" max="300" step="0.1" placeholder="e.g. 178">
            </div>
            <div class="field">
              <label for="pActivity">Activity level</label>
              <select id="pActivity">
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="light">Light (1–3 days/week)</option>
                <option value="moderate">Moderate (3–5 days/week)</option>
                <option value="active">Active (6–7 days/week)</option>
                <option value="very_active">Very active (hard daily + physical job)</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="pUnit">Display units</label>
              <select id="pUnit">
                <option value="kg">Kilograms</option>
                <option value="lb">Pounds</option>
              </select>
              <span class="hint">Logging still stores kg under the hood for consistent math.</span>
            </div>
            <div class="field">
              <label for="pGoal">Goal weight (kg)</label>
              <input type="number" id="pGoal" min="1" step="0.1" placeholder="e.g. 78">
            </div>
          </div>
          <button type="submit" class="btn btn-primary" id="pSaveBtn">Save changes</button>
        </form>
      </div>

      <div class="card">
        <div class="card-title">Lift goals</div>
        <form id="goalForm" class="mb-16">
          <div class="field">
            <label for="gExercise">Exercise</label>
            <select id="gExercise"></select>
          </div>
          <div class="form-row">
            <div class="field"><label for="gWeight">Target weight (kg)</label><input type="number" id="gWeight" min="1" step="0.5" required placeholder="e.g. 120"></div>
            <div class="field"><label for="gReps">At reps</label><input type="number" id="gReps" min="1" value="1"></div>
          </div>
          <button type="submit" class="btn btn-secondary btn-block">Set goal</button>
        </form>
        <div id="goalListWrap"></div>
      </div>
    </div>
  </div>

  <!-- ── Tab: Settings ── -->
  <div id="tab-settings" class="profile-tab-content" style="display:none;">
    <div class="settings-grid" id="settingsSection"></div>
  </div>
`;

async function loadProfile() {
  try {
    const user = await Api.getProfile();
    Auth.setUser(user);
    document.getElementById("pUsername").value = user.username;
    document.getElementById("pEmail").value = user.email;
    document.getElementById("pGender").value = user.gender || "";
    document.getElementById("pAge").value = user.age ?? "";
    document.getElementById("pHeight").value = user.height_cm ?? "";
    document.getElementById("pActivity").value = user.activity_level || "moderate";
    document.getElementById("pUnit").value = user.unit_preference || "kg";
    document.getElementById("pGoal").value = user.goal_weight_kg ?? "";
  } catch (err) {
    handleApiError(err);
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("pSaveBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    await Api.updateProfile({
      gender: document.getElementById("pGender").value || null,
      age: document.getElementById("pAge").value ? parseInt(document.getElementById("pAge").value) : null,
      height_cm: document.getElementById("pHeight").value ? parseFloat(document.getElementById("pHeight").value) : null,
      activity_level: document.getElementById("pActivity").value,
      unit_preference: document.getElementById("pUnit").value,
      goal_weight_kg: document.getElementById("pGoal").value ? parseFloat(document.getElementById("pGoal").value) : null,
    });
    showToast("Profile updated.");
    await loadProfile();
  } catch (err) {
    handleApiError(err);
  } finally {
    btn.disabled = false; btn.textContent = "Save changes";
  }
});

async function loadGoalExerciseOptions() {
  const exercises = await Api.listExercises();
  document.getElementById("gExercise").innerHTML = buildGroupedExerciseOptions(exercises);
}

document.getElementById("goalForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await Api.setLiftGoal({
      exercise_id: parseInt(document.getElementById("gExercise").value),
      target_weight_kg: parseFloat(document.getElementById("gWeight").value),
      target_reps: parseInt(document.getElementById("gReps").value || "1"),
    });
    showToast("Goal set.");
    document.getElementById("gWeight").value = "";
    await loadGoals();
  } catch (err) {
    handleApiError(err);
  }
});

async function deleteGoal(id) {
  if (!confirm("Remove this goal?")) return;
  try {
    await Api.deleteLiftGoal(id);
    showToast("Goal removed.");
    await loadGoals();
  } catch (err) {
    handleApiError(err);
  }
}
window.deleteGoal = deleteGoal;

async function loadGoals() {
  const wrap = document.getElementById("goalListWrap");
  try {
    const [goals, exercises] = await Promise.all([Api.listLiftGoals(), Api.listExercises()]);
    const exMap = Object.fromEntries(exercises.map(e => [e.id, e.name]));
    if (!goals.length) {
      wrap.innerHTML = `<div class="empty-state" style="padding:24px;"><p>No lift goals yet.</p></div>`;
      return;
    }
    wrap.innerHTML = goals.map(g => `
      <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div>
          <strong style="font-size:13.5px;">${escapeHtml(exMap[g.exercise_id] || "Exercise")}</strong>
          <div class="text-tertiary" style="font-size:12px;">${fmtKg(g.target_weight_kg)} kg × ${g.target_reps}</div>
        </div>
        <button class="icon-btn" onclick="deleteGoal(${g.id})" title="Remove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
    `).join("");
  } catch (err) {
    handleApiError(err);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

(async function init() {
  // Tab switching
  document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).style.display = 'block';
      // Load settings when tab is first opened
      if (btn.dataset.tab === 'settings') {
        loadSettingsSection();
      }
    });
  });

  await loadProfile();
  await loadGoalExerciseOptions();
  await loadGoals();
})();

// ── Settings section (theme + push + export) ──────────────────────────────
async function loadSettingsSection() {
  const settingsEl = document.getElementById('settingsSection');
  if (!settingsEl) return;

  // Theme
  const currentTheme = IronlogTheme ? IronlogTheme.current() : 'dark';
  const isDark = currentTheme === 'dark';

  // Push support
  const pushSupported = IronlogPush && IronlogPush.isSupported();
  const pushSubscribed = pushSupported ? await IronlogPush.isSubscribed() : false;

  // Check if VAPID is configured by fetching the public key
  let vapidConfigured = false;
  try {
    const vk = await apiRequest('/push/vapid-public-key');
    vapidConfigured = !!(vk && vk.public_key);
  } catch(e) {}

  settingsEl.innerHTML = `
    <div class="card">
      <div class="card-title">Appearance</div>
      <div class="settings-row">
        <div class="settings-info">
          <div class="settings-label">Theme</div>
          <div class="settings-sub">${isDark ? 'Dark mode is active' : 'Light mode is active'}</div>
        </div>
        <button class="settings-btn" id="themeToggleBtn" data-theme-toggle>
          ${isDark ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Notifications</div>
      ${!pushSupported ? `
        <div class="settings-row">
          <div class="settings-info">
            <div class="settings-label">Push notifications</div>
            <div class="settings-sub" style="color:var(--text-tertiary);">
              Not supported in this browser. Use Chrome or Edge on desktop, or Chrome on Android.
            </div>
          </div>
        </div>
      ` : !vapidConfigured ? `
        <div class="settings-row">
          <div class="settings-info">
            <div class="settings-label">Push notifications</div>
            <div class="settings-sub" style="color:var(--text-tertiary);">
              Not yet configured on this server. Add <code>VAPID_PRIVATE_KEY</code> and
              <code>VAPID_PUBLIC_KEY</code> to your Render environment variables to enable.
            </div>
          </div>
        </div>
      ` : `
        <div class="settings-row">
          <div class="settings-info">
            <div class="settings-label">Workout reminders</div>
            <div class="settings-sub">
              ${pushSubscribed
                ? 'You will be notified of new PRs and inactivity reminders.'
                : 'Get notified when you hit a new PR or have not trained in 3 days.'}
            </div>
          </div>
          <button class="settings-btn ${pushSubscribed ? 'settings-btn-active' : ''}" id="pushToggleBtn">
            ${pushSubscribed ? '🔔 Enabled' : '🔕 Enable'}
          </button>
        </div>
        ${pushSubscribed ? `
        <div class="settings-row" style="padding-top:0;border-top:none;">
          <div class="settings-info">
            <div class="settings-sub">Send a test notification to confirm it works.</div>
          </div>
          <button class="settings-btn" id="pushTestBtn">Send test</button>
        </div>` : ''}
      `}
    </div>

    <div class="card">
      <div class="card-title">Your Data</div>
      <div class="settings-row">
        <div class="settings-info">
          <div class="settings-label">Export all data</div>
          <div class="settings-sub">Download all lifts, weight, nutrition and workout history. Your data, always.</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <button class="settings-btn" id="exportJsonBtn">⬇ JSON</button>
          <button class="settings-btn" id="exportCsvBtn">⬇ CSV</button>
        </div>
      </div>
    </div>
  `;

  // Theme toggle
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    IronlogTheme.toggle();
    loadSettingsSection(); // re-render to update button text
  });

  // Push toggle
  document.getElementById('pushToggleBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('pushToggleBtn');
    btn.disabled = true;
    btn.textContent = 'Please wait…';
    if (pushSubscribed) {
      const res = await IronlogPush.unsubscribe();
      showToast(res.ok ? 'Notifications disabled.' : (res.reason || 'Could not disable.'));
    } else {
      const res = await IronlogPush.subscribe();
      if (res.ok) {
        showToast('Notifications enabled! You will get PR and inactivity alerts.');
      } else {
        // Show friendly message — don't show raw error
        showToast('Could not enable: ' + (res.reason || 'Permission denied.'));
      }
    }
    await loadSettingsSection();
  });

  // Push test
  document.getElementById('pushTestBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('pushTestBtn');
    btn.disabled = true; btn.textContent = 'Sending…';
    const res = await IronlogPush.sendTest();
    if (res.ok) showToast('Test notification sent!');
    else showToast(res.reason || 'Could not send test.', 'error');
    btn.disabled = false; btn.textContent = 'Send test';
  });

  // Export
  document.getElementById('exportJsonBtn')?.addEventListener('click', () => IronlogExport.download('json'));
  document.getElementById('exportCsvBtn')?.addEventListener('click', () => IronlogExport.download('csv'));
}