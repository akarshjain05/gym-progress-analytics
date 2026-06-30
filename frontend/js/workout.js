// workout.js — IRONLOG Workout Templates & Active Workout Mode
// Two modes:
//   1. Templates list — create/edit/delete workout plans
//   2. Active workout — full-screen timer-based session

(function () {
  renderShell("workout", "Workouts", "Templates & active workout tracker");

  const content = document.getElementById("pageContent");

  // ── State ────────────────────────────────────────────────────────────────
  let exercises = [];          // all available exercises
  let templates = [];          // user's saved templates
  let activeWorkout = null;    // { template, exercises: [{...}], startTime, timerInterval }

  // ── Initial render ────────────────────────────────────────────────────────
  content.innerHTML = `
    <div id="workoutPage">

      <!-- Header actions -->
      <div class="wk-header-row">
        <div class="wk-header-btns">
          <button class="btn btn-primary" id="startFreeBtn">▶ Start Free Workout</button>
          <button class="btn btn-secondary" id="createTemplateBtn">+ New Template</button>
        </div>
      </div>

      <!-- Templates grid -->
      <div id="templatesSection">
        <div class="wk-section-label">YOUR TEMPLATES</div>
        <div id="templatesLoading" class="wk-loading">
          <div class="ironlog-spinner"></div><span>Loading templates…</span>
        </div>
        <div id="templatesGrid" style="display:none;"></div>
        <div id="templatesEmpty" style="display:none;" class="wk-empty">
          <div class="wk-empty-icon">📋</div>
          <h3>No templates yet</h3>
          <p>Create a template to plan your workouts in advance. e.g. "Push Day A", "Leg Day".</p>
          <button class="btn btn-primary" id="createFirstBtn">Create your first template</button>
        </div>
      </div>

      <!-- Workout History -->
      <div id="historySection" style="margin-top:32px;">
        <div class="wk-section-label">WORKOUT HISTORY</div>
        <div id="historyLoading" class="wk-loading">
          <div class="ironlog-spinner"></div><span>Loading history…</span>
        </div>
        <div id="historyList" style="display:none;"></div>
        <div id="historyEmpty" style="display:none;" class="wk-empty wk-empty-sm">
          <div class="wk-empty-icon">🏋️</div>
          <h3>No workouts yet</h3>
          <p>Complete a workout and it will show up here.</p>
        </div>
      </div>

    </div>

    <!-- ── Create/Edit Template Modal ─────────────────────────────────── -->
    <div id="templateModal" class="wk-modal-overlay" style="display:none;">
      <div class="wk-modal">
        <div class="wk-modal-header">
          <span id="templateModalTitle">New Template</span>
          <button class="wk-modal-close" id="closeTemplateModal">✕</button>
        </div>
        <div class="wk-modal-body">
          <div class="wk-field">
            <label class="wk-label">Template name</label>
            <input type="text" id="tmplName" class="wk-input" placeholder="e.g. Push Day A" maxlength="60">
          </div>
          <div class="wk-field">
            <label class="wk-label">Description (optional)</label>
            <input type="text" id="tmplDesc" class="wk-input" placeholder="e.g. Chest, shoulders, triceps">
          </div>

          <div class="wk-section-label" style="margin-top:20px;">EXERCISES</div>
          <div id="tmplExerciseList"></div>

          <div class="wk-add-exercise-row">
            <select id="tmplAddExerciseSelect" class="wk-select"></select>
            <button class="btn btn-secondary" id="tmplAddExBtn">+ Add</button>
          </div>
        </div>
        <div class="wk-modal-footer">
          <button class="btn btn-secondary" id="cancelTemplateModal">Cancel</button>
          <button class="btn btn-primary" id="saveTemplateBtn">Save Template</button>
        </div>
      </div>
    </div>

    <!-- ── Active Workout Screen (full page overlay) ───────────────────── -->
    <div id="activeWorkout" class="wk-active-overlay" style="display:none;">
      <div class="wk-active-container">

        <!-- Top bar -->
        <div class="wk-active-topbar">
          <div class="wk-active-info">
            <div class="wk-active-name" id="awName">Workout</div>
            <div class="wk-active-timer" id="awTimer">00:00</div>
          </div>
          <button class="wk-finish-btn" id="awFinishBtn">Finish</button>
        </div>

        <!-- Exercise tabs / pills -->
        <div class="wk-exercise-tabs" id="awTabs"></div>

        <!-- Current exercise panel -->
        <div class="wk-exercise-panel" id="awPanel"></div>

        <!-- Rest timer (shown between sets) -->
        <div class="wk-rest-timer" id="awRestTimer" style="display:none;">
          <div class="wk-rest-label">REST</div>
          <div class="wk-rest-count" id="awRestCount">90</div>
          <div class="wk-rest-progress"><div class="wk-rest-bar" id="awRestBar"></div></div>
          <button class="wk-rest-skip" id="awRestSkip">Skip rest →</button>
        </div>

      </div>
    </div>

    <!-- ── Workout Complete Modal ──────────────────────────────────────── -->
    <div id="workoutCompleteModal" class="wk-modal-overlay" style="display:none;">
      <div class="wk-modal wk-complete-modal">
        <div class="wk-complete-emoji">🎉</div>
        <h2 class="wk-complete-title">Workout Complete!</h2>
        <div id="wcStats" class="wk-complete-stats"></div>
        <div id="wcPRs" class="wk-prs"></div>
        <div class="wk-modal-footer wk-complete-footer" style="flex-direction:column;gap:8px;">
          <button class="btn btn-primary wk-btn-full" id="wcDoneBtn">Back to Workouts</button>
          <button class="btn btn-secondary wk-btn-full" id="wcLiftsBtn">View in Lifts →</button>
        </div>
      </div>
    </div>
  `;

  let workoutHistory = [];    // completed workout sessions

  // ── Load data ────────────────────────────────────────────────────────────
  async function init() {
    try {
      [exercises, templates] = await Promise.all([
        apiRequest('/exercises'),
        apiRequest('/templates'),
      ]);
      populateExerciseSelect('tmplAddExerciseSelect');
      renderTemplates();
      // Load workout history
      loadHistory();
      window.hideLoading && window.hideLoading();
    } catch (err) {
      handleApiError(err);
      window.hideLoading && window.hideLoading();
    }
  }

  async function loadHistory() {
    try {
      workoutHistory = await apiRequest('/templates/history');
      renderHistory();
    } catch (err) {
      console.warn('[workout] Could not load history:', err);
      // Non-critical, don't block the page
      document.getElementById('historyLoading').style.display = 'none';
      document.getElementById('historyEmpty').style.display = 'flex';
    }
  }

  function populateExerciseSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = buildGroupedExerciseOptions(exercises);
  }

  // ── Render templates grid ─────────────────────────────────────────────────
  function renderTemplates() {
    document.getElementById('templatesLoading').style.display = 'none';
    const grid = document.getElementById('templatesGrid');
    const empty = document.getElementById('templatesEmpty');

    if (!templates.length) {
      grid.style.display = 'none';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = templates.map(t => `
      <div class="wk-template-card" data-id="${t.id}">
        <div class="wk-tc-header">
          <div class="wk-tc-name">${escHtml(t.name)}</div>
          <div class="wk-tc-actions">
            <button class="wk-icon-btn wk-edit-btn" data-id="${t.id}" title="Edit">✏️</button>
            <button class="wk-icon-btn wk-del-btn" data-id="${t.id}" title="Delete">🗑️</button>
          </div>
        </div>
        ${t.description ? `<div class="wk-tc-desc">${escHtml(t.description)}</div>` : ''}
        <div class="wk-tc-exercises">
          ${t.exercises.slice(0, 5).map(e => `
            <div class="wk-tc-ex">
              <span class="wk-tc-ex-name">${escHtml(e.exercise_name)}</span>
              <span class="wk-tc-ex-meta">${e.target_sets}×${e.target_reps}${e.target_weight_kg ? ' @ ' + e.target_weight_kg + 'kg' : ''}</span>
            </div>
          `).join('')}
          ${t.exercises.length > 5 ? `<div class="wk-tc-more">+${t.exercises.length - 5} more</div>` : ''}
        </div>
        <div class="wk-tc-footer">
          <span class="wk-tc-count">${t.exercise_count} exercise${t.exercise_count !== 1 ? 's' : ''}</span>
          <button class="btn btn-primary wk-start-btn" data-id="${t.id}">▶ Start</button>
        </div>
      </div>
    `).join('');

    // Event bindings for template cards
    grid.querySelectorAll('.wk-start-btn').forEach(btn => {
      btn.addEventListener('click', () => startWorkout(parseInt(btn.dataset.id)));
    });
    grid.querySelectorAll('.wk-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditTemplate(parseInt(btn.dataset.id)));
    });
    grid.querySelectorAll('.wk-del-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTemplate(parseInt(btn.dataset.id)));
    });
  }

  // ── Render workout history ────────────────────────────────────────────────
  function renderHistory() {
    document.getElementById('historyLoading').style.display = 'none';
    const list = document.getElementById('historyList');
    const empty = document.getElementById('historyEmpty');

    if (!workoutHistory.length) {
      list.style.display = 'none';
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';
    list.style.display = 'block';

    // Group sessions by date for timeline look
    const byDate = {};
    for (const s of workoutHistory) {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    }

    const fmtDate = (d) => {
      const dt = new Date(d + 'T00:00:00');
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      if (dt.getTime() === today.getTime()) return 'Today';
      if (dt.getTime() === yesterday.getTime()) return 'Yesterday';
      return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const fmtDuration = (sec) => {
      if (!sec) return '—';
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      if (m >= 60) return `${Math.floor(m/60)}h ${m%60}m`;
      return `${m}m ${s}s`;
    };

    list.innerHTML = Object.keys(byDate).map(date => `
      <div class="wk-history-date-group">
        <div class="wk-history-date">${fmtDate(date)}</div>
        ${byDate[date].map(s => `
          <div class="wk-history-card" data-id="${s.id}">
            <div class="wk-history-card-top">
              <div class="wk-history-name">
                <span class="wk-history-icon">${s.template_id ? '📋' : '🏋️'}</span>
                ${escHtml(s.template_name)}
              </div>
              <button class="wk-icon-btn wk-history-del" data-id="${s.id}" title="Delete">🗑️</button>
            </div>
            <div class="wk-history-meta">
              <span>⏱ ${fmtDuration(s.duration_seconds)}</span>
              <span>💪 ${s.exercises_count} exercise${s.exercises_count !== 1 ? 's' : ''}</span>
              <span>📊 ${s.sets_count} set${s.sets_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    // Delete handler
    list.querySelectorAll('.wk-history-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id);
        if (!confirm('Delete this workout record? (The lift logs are preserved.)')) return;
        try {
          await apiRequest(`/templates/history/${id}`, { method: 'DELETE' });
          workoutHistory = workoutHistory.filter(s => s.id !== id);
          renderHistory();
          showToast('Workout record deleted.');
        } catch (err) {
          handleApiError(err);
        }
      });
    });
  }

  // ── Create / Edit Template Modal ──────────────────────────────────────────
  let editingTemplateId = null;
  let tmplExercises = []; // [{exercise_id, exercise_name, target_sets, target_reps, target_weight_kg, rest_seconds, notes, te_id?}]

  function openCreateTemplate() {
    editingTemplateId = null;
    tmplExercises = [];
    document.getElementById('templateModalTitle').textContent = 'New Template';
    document.getElementById('tmplName').value = '';
    document.getElementById('tmplDesc').value = '';
    renderTmplExercises();
    document.getElementById('templateModal').style.display = 'flex';
  }

  async function openEditTemplate(id) {
    try {
      const t = await apiRequest(`/templates/${id}`);
      editingTemplateId = id;
      tmplExercises = t.exercises.map(e => ({
        te_id: e.id,
        exercise_id: e.exercise_id,
        exercise_name: e.exercise_name,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight_kg: e.target_weight_kg || '',
        rest_seconds: e.rest_seconds,
        notes: e.notes || '',
      }));
      document.getElementById('templateModalTitle').textContent = 'Edit Template';
      document.getElementById('tmplName').value = t.name;
      document.getElementById('tmplDesc').value = t.description || '';
      renderTmplExercises();
      document.getElementById('templateModal').style.display = 'flex';
    } catch (err) {
      handleApiError(err);
    }
  }

  function renderTmplExercises() {
    const container = document.getElementById('tmplExerciseList');
    if (!tmplExercises.length) {
      container.innerHTML = '<div class="wk-empty-ex">No exercises yet. Add some below.</div>';
      return;
    }
    container.innerHTML = tmplExercises.map((e, i) => `
      <div class="wk-tmpl-ex-row" data-idx="${i}">
        <div class="wk-tmpl-ex-drag">☰</div>
        <div class="wk-tmpl-ex-info">
          <div class="wk-tmpl-ex-name">${escHtml(e.exercise_name)}</div>
          <div class="wk-tmpl-ex-inputs">
            <label>Sets<input type="number" class="wk-input wk-input-sm tmpl-sets"
              value="${e.target_sets}" min="1" max="20" data-idx="${i}"></label>
            <label>Reps<input type="number" class="wk-input wk-input-sm tmpl-reps"
              value="${e.target_reps}" min="1" max="100" data-idx="${i}"></label>
            <label>Weight(kg)<input type="number" class="wk-input wk-input-sm tmpl-weight"
              value="${e.target_weight_kg || ''}" min="0" max="600" step="0.5" placeholder="—" data-idx="${i}"></label>
            <label>Rest(s)<input type="number" class="wk-input wk-input-sm tmpl-rest"
              value="${e.rest_seconds}" min="0" max="600" data-idx="${i}"></label>
          </div>
        </div>
        <button class="wk-icon-btn wk-tmpl-remove" data-idx="${i}">✕</button>
      </div>
    `).join('');

    // Sync inputs to tmplExercises
    container.querySelectorAll('.tmpl-sets').forEach(inp =>
      inp.addEventListener('change', () => { tmplExercises[inp.dataset.idx].target_sets = parseInt(inp.value) || 3; }));
    container.querySelectorAll('.tmpl-reps').forEach(inp =>
      inp.addEventListener('change', () => { tmplExercises[inp.dataset.idx].target_reps = parseInt(inp.value) || 10; }));
    container.querySelectorAll('.tmpl-weight').forEach(inp =>
      inp.addEventListener('change', () => { tmplExercises[inp.dataset.idx].target_weight_kg = parseFloat(inp.value) || null; }));
    container.querySelectorAll('.tmpl-rest').forEach(inp =>
      inp.addEventListener('change', () => { tmplExercises[inp.dataset.idx].rest_seconds = parseInt(inp.value) || 90; }));

    container.querySelectorAll('.wk-tmpl-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        tmplExercises.splice(parseInt(btn.dataset.idx), 1);
        renderTmplExercises();
      });
    });
  }

  document.getElementById('tmplAddExBtn').addEventListener('click', () => {
    const sel = document.getElementById('tmplAddExerciseSelect');
    const id = parseInt(sel.value);
    const name = sel.options[sel.selectedIndex]?.text || 'Exercise';
    if (!id) return;
    tmplExercises.push({
      exercise_id: id, exercise_name: name,
      target_sets: 3, target_reps: 10,
      target_weight_kg: null, rest_seconds: 90, notes: '',
    });
    renderTmplExercises();
  });

  document.getElementById('saveTemplateBtn').addEventListener('click', async () => {
    const name = document.getElementById('tmplName').value.trim();
    const desc = document.getElementById('tmplDesc').value.trim();
    if (!name) { showToast('Please enter a template name.', 'error'); return; }

    const btn = document.getElementById('saveTemplateBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const payload = {
      name, description: desc || null,
      exercises: tmplExercises.map((e, i) => ({
        exercise_id: e.exercise_id,
        position: i,
        target_sets: e.target_sets || 3,
        target_reps: e.target_reps || 10,
        target_weight_kg: e.target_weight_kg || null,
        rest_seconds: e.rest_seconds || 90,
        notes: e.notes || null,
      })),
    };

    try {
      if (editingTemplateId) {
        // Update name/desc first
        await apiRequest(`/templates/${editingTemplateId}`, {
          method: 'PUT', body: { name, description: desc || null },
        });
        // For simplicity: delete all exercises and re-add
        const existing = templates.find(t => t.id === editingTemplateId);
        if (existing) {
          for (const te of existing.exercises) {
            await apiRequest(`/templates/${editingTemplateId}/exercises/${te.id}`, { method: 'DELETE' });
          }
        }
        for (const ex of payload.exercises) {
          await apiRequest(`/templates/${editingTemplateId}/exercises`, { method: 'POST', body: ex });
        }
      } else {
        await apiRequest('/templates', { method: 'POST', body: payload });
      }

      templates = await apiRequest('/templates');
      renderTemplates();
      document.getElementById('templateModal').style.display = 'none';
      showToast(editingTemplateId ? 'Template updated!' : 'Template created!');
    } catch (err) {
      handleApiError(err, 'Could not save template.');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Template';
    }
  });

  async function deleteTemplate(id) {
    const t = templates.find(t => t.id === id);
    if (!confirm(`Delete "${t?.name || 'this template'}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/templates/${id}`, { method: 'DELETE' });
      templates = templates.filter(t => t.id !== id);
      renderTemplates();
      showToast('Template deleted.');
    } catch (err) {
      handleApiError(err);
    }
  }

  // Modal close handlers
  document.getElementById('closeTemplateModal').addEventListener('click', () => {
    document.getElementById('templateModal').style.display = 'none';
  });
  document.getElementById('cancelTemplateModal').addEventListener('click', () => {
    document.getElementById('templateModal').style.display = 'none';
  });
  document.getElementById('createTemplateBtn').addEventListener('click', openCreateTemplate);
  document.getElementById('createFirstBtn')?.addEventListener('click', openCreateTemplate);

  // ── Active Workout ─────────────────────────────────────────────────────────
  // State: array of exercise panels, each with logged sets
  let awExercises = [];   // [{exercise_id, exercise_name, target_sets, target_reps, target_weight_kg, rest_seconds, loggedSets:[]}]
  let awCurrentIdx = 0;
  let awStartTime = null;
  let awTimerInterval = null;
  let awRestInterval = null;
  let awTemplateId = 0;

  async function startWorkout(templateId) {
    try {
      const t = templateId ? await apiRequest(`/templates/${templateId}`) : null;
      awTemplateId = templateId || 0;

      if (t && t.exercises.length === 0) {
        showToast('This template has no exercises. Add some first.', 'error');
        return;
      }

      awExercises = t ? t.exercises.map(e => ({
        exercise_id: e.exercise_id,
        exercise_name: e.exercise_name,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight_kg: e.target_weight_kg,
        rest_seconds: e.rest_seconds,
        loggedSets: [],
        notes: '',
      })) : [{
        // Free workout starts with one empty exercise slot
        exercise_id: exercises[0]?.id || 0,
        exercise_name: exercises[0]?.name || '',
        target_sets: 3,
        target_reps: 10,
        target_weight_kg: null,
        rest_seconds: 90,
        loggedSets: [],
        notes: '',
      }];

      awCurrentIdx = 0;
      awStartTime = Date.now();
      document.getElementById('awName').textContent = t ? t.name : 'Free Workout';
      document.getElementById('activeWorkout').style.display = 'flex';
      document.body.style.overflow = 'hidden';

      startTimer();
      renderAwTabs();
      renderAwPanel();
    } catch (err) {
      handleApiError(err);
    }
  }

  function startTimer() {
    clearInterval(awTimerInterval);
    awTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - awStartTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      const el = document.getElementById('awTimer');
      if (el) el.textContent = `${m}:${s}`;
    }, 1000);
  }

  function renderAwTabs() {
    const tabs = document.getElementById('awTabs');
    tabs.innerHTML = awExercises.map((e, i) => {
      const done = e.loggedSets.length >= e.target_sets;
      return `<button class="wk-tab ${i === awCurrentIdx ? 'active' : ''} ${done ? 'done' : ''}"
        data-idx="${i}">${i + 1}. ${e.exercise_name.split(' ').slice(0, 2).join(' ')}</button>`;
    }).join('');

    if (awTemplateId === 0) {
      // Free workout: add exercise button
      tabs.innerHTML += `<button class="wk-tab wk-tab-add" id="awAddExBtn">+</button>`;
      document.getElementById('awAddExBtn')?.addEventListener('click', addExerciseToWorkout);
    }

    tabs.querySelectorAll('.wk-tab[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        awCurrentIdx = parseInt(btn.dataset.idx);
        renderAwTabs();
        renderAwPanel();
      });
    });
  }

  function addExerciseToWorkout() {
    // Show quick picker
    const sel = document.createElement('select');
    sel.className = 'wk-select';
    sel.innerHTML = buildGroupedExerciseOptions(exercises);

    const overlay = document.createElement('div');
    overlay.className = 'wk-quick-pick';
    overlay.innerHTML = `
      <div class="wk-quick-pick-box">
        <div class="wk-quick-pick-title">Add Exercise</div>
      </div>`;
    overlay.querySelector('.wk-quick-pick-box').appendChild(sel);

    const btnRow = document.createElement('div');
    btnRow.className = 'wk-modal-footer';
    btnRow.innerHTML = `<button class="btn btn-secondary" id="qpCancel">Cancel</button>
                        <button class="btn btn-primary" id="qpAdd">Add</button>`;
    overlay.querySelector('.wk-quick-pick-box').appendChild(btnRow);
    document.body.appendChild(overlay);

    document.getElementById('qpCancel').onclick = () => overlay.remove();
    document.getElementById('qpAdd').onclick = () => {
      const id = parseInt(sel.value);
      const name = sel.options[sel.selectedIndex]?.text || '';
      awExercises.push({
        exercise_id: id, exercise_name: name,
        target_sets: 3, target_reps: 10, target_weight_kg: null,
        rest_seconds: 90, loggedSets: [], notes: '',
      });
      awCurrentIdx = awExercises.length - 1;
      overlay.remove();
      renderAwTabs();
      renderAwPanel();
    };
  }

  function renderAwPanel() {
    const panel = document.getElementById('awPanel');
    const ex = awExercises[awCurrentIdx];
    if (!ex) return;

    const isBodyweight = ['pull-up','chin-up','dip','hanging leg raise','plank'].includes(ex.exercise_name.toLowerCase());

    const setsHtml = Array.from({ length: ex.target_sets }, (_, i) => {
      const logged = ex.loggedSets[i];
      const isDone = !!logged;
      return `
        <div class="wk-set-row ${isDone ? 'done' : ''}" data-set="${i}">
          <div class="wk-set-num">Set ${i + 1}</div>
          ${isBodyweight ? '' : `
          <div class="wk-set-field">
            <label>Weight (kg)</label>
            <input type="number" class="wk-input aw-weight" data-set="${i}"
              value="${logged ? logged.weight_kg : (ex.target_weight_kg || '')}"
              placeholder="${ex.target_weight_kg || '0'}" min="0" max="600" step="0.5"
              ${isDone ? 'disabled' : ''}>
          </div>`}
          <div class="wk-set-field">
            <label>Reps</label>
            <input type="number" class="wk-input aw-reps" data-set="${i}"
              value="${logged ? logged.reps : ex.target_reps}"
              placeholder="${ex.target_reps}" min="1" max="100"
              ${isDone ? 'disabled' : ''}>
          </div>
          <div class="wk-set-field">
            <label>RPE</label>
            <input type="number" class="wk-input aw-rpe" data-set="${i}"
              value="${logged ? (logged.rpe || '') : ''}"
              placeholder="—" min="1" max="10" step="0.5"
              ${isDone ? 'disabled' : ''}>
          </div>
          <button class="wk-log-set-btn ${isDone ? 'done' : ''}" data-set="${i}">
            ${isDone ? '✓' : 'Log Set'}
          </button>
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="wk-panel-header">
        <div class="wk-panel-title">${escHtml(ex.exercise_name)}</div>
        <div class="wk-panel-target">${ex.target_sets} sets × ${ex.target_reps} reps${ex.target_weight_kg ? ' @ ' + ex.target_weight_kg + 'kg' : ''}</div>
        <div class="wk-panel-progress">
          <div class="wk-panel-progress-bar" style="width:${Math.min(100,(ex.loggedSets.length/ex.target_sets)*100)}%"></div>
        </div>
        <div class="wk-panel-progress-txt">${ex.loggedSets.length}/${ex.target_sets} sets done</div>
      </div>

      <div class="wk-sets-container">${setsHtml}</div>

      <div class="wk-panel-nav">
        ${awCurrentIdx > 0 ? `<button class="btn btn-secondary" id="awPrevBtn">← Previous</button>` : '<div></div>'}
        ${awCurrentIdx < awExercises.length - 1
          ? `<button class="btn btn-primary" id="awNextBtn">Next Exercise →</button>`
          : `<button class="btn btn-primary wk-finish-btn-bottom" id="awFinishBtnBottom">Finish Workout 🎉</button>`
        }
      </div>
    `;

    // Log set buttons
    panel.querySelectorAll('.wk-log-set-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const setIdx = parseInt(btn.dataset.set);
        if (ex.loggedSets[setIdx]) return; // already logged

        const weightInput = panel.querySelector(`.aw-weight[data-set="${setIdx}"]`);
        const repsInput = panel.querySelector(`.aw-reps[data-set="${setIdx}"]`);
        const rpeInput = panel.querySelector(`.aw-rpe[data-set="${setIdx}"]`);

        const weight = isBodyweight ? 0 : (parseFloat(weightInput?.value) || 0);
        const reps = parseInt(repsInput?.value) || 0;
        const rpe = parseFloat(rpeInput?.value) || null;

        if (!isBodyweight && weight < 0) { showToast('Enter a valid weight.', 'error'); return; }
        if (reps < 1) { showToast('Enter valid reps.', 'error'); return; }

        ex.loggedSets[setIdx] = { weight_kg: weight, reps, rpe, completed: true };
        renderAwTabs();
        renderAwPanel();

        // Show rest timer if not last set
        if (setIdx < ex.target_sets - 1) {
          startRestTimer(ex.rest_seconds || 90);
        } else {
          showToast(`All sets done for ${ex.exercise_name}!`);
        }
      });
    });

    // Navigation
    document.getElementById('awPrevBtn')?.addEventListener('click', () => {
      awCurrentIdx--;
      renderAwTabs();
      renderAwPanel();
    });
    document.getElementById('awNextBtn')?.addEventListener('click', () => {
      awCurrentIdx++;
      renderAwTabs();
      renderAwPanel();
    });
    document.getElementById('awFinishBtnBottom')?.addEventListener('click', finishWorkout);
  }

  // ── Rest timer ─────────────────────────────────────────────────────────────
  function startRestTimer(seconds) {
    clearInterval(awRestInterval);
    const timerEl = document.getElementById('awRestTimer');
    const countEl = document.getElementById('awRestCount');
    const barEl = document.getElementById('awRestBar');
    if (!timerEl || !countEl || !barEl) return;

    let remaining = seconds;
    timerEl.style.display = 'flex';
    countEl.textContent = remaining;
    barEl.style.width = '100%';

    awRestInterval = setInterval(() => {
      remaining--;
      if (countEl) countEl.textContent = remaining;
      if (barEl) barEl.style.width = `${(remaining / seconds) * 100}%`;
      if (remaining <= 0) {
        clearInterval(awRestInterval);
        if (timerEl) timerEl.style.display = 'none';
        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 1000);

    document.getElementById('awRestSkip')?.addEventListener('click', () => {
      clearInterval(awRestInterval);
      timerEl.style.display = 'none';
    });
  }

  // ── Finish workout ─────────────────────────────────────────────────────────
  document.getElementById('awFinishBtn').addEventListener('click', () => {
    if (confirm('Finish workout? All logged sets will be saved.')) {
      finishWorkout();
    }
  });

  async function finishWorkout() {
    clearInterval(awTimerInterval);
    clearInterval(awRestInterval);

    const duration = Math.floor((Date.now() - awStartTime) / 1000);
    const today = new Date().toISOString().split('T')[0];

    const exercisesPayload = awExercises
      .filter(e => e.loggedSets.some(s => s.completed))
      .map(e => ({
        exercise_id: e.exercise_id,
        sets: e.loggedSets.filter(s => s.completed),
        notes: e.notes || null,
      }));

    if (!exercisesPayload.length) {
      showToast('No completed sets to save.', 'error');
      return;
    }

    const btn = document.getElementById('awFinishBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      const endpoint = awTemplateId
        ? `/templates/${awTemplateId}/finish`
        : '/templates/free/finish';

      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: { date: today, duration_seconds: duration, exercises: exercisesPayload },
      });

      // Show completion modal
      document.getElementById('activeWorkout').style.display = 'none';
      document.body.style.overflow = '';
      showCompletionModal(result, duration);

    } catch (err) {
      handleApiError(err, 'Could not save workout.');
      if (btn) { btn.disabled = false; btn.textContent = 'Finish'; }
    }
  }

  function showCompletionModal(result, durationSeconds) {
    const modal = document.getElementById('workoutCompleteModal');
    const durationStr = durationSeconds
      ? `${Math.floor(durationSeconds/60)}m ${durationSeconds%60}s`
      : '—';

    document.getElementById('wcStats').innerHTML = `
      <div class="wk-stat"><div class="wk-stat-val">${result.exercises_saved}</div><div class="wk-stat-lbl">Exercises</div></div>
      <div class="wk-stat"><div class="wk-stat-val">${result.total_sets_saved}</div><div class="wk-stat-lbl">Sets logged</div></div>
      <div class="wk-stat"><div class="wk-stat-val">${durationStr}</div><div class="wk-stat-lbl">Duration</div></div>
    `;

    const prsEl = document.getElementById('wcPRs');
    if (result.new_prs && result.new_prs.length > 0) {
      prsEl.innerHTML = `
        <div class="wk-prs-title">🏆 New Personal Records!</div>
        ${result.new_prs.map(pr => `
          <div class="wk-pr-item">
            <strong>${escHtml(pr.exercise)}</strong>
            <span>${pr.new_1rm_kg}kg est. 1RM</span>
            ${pr.old_1rm_kg > 0 ? `<span class="wk-pr-delta">+${Math.round((pr.new_1rm_kg - pr.old_1rm_kg)*10)/10}kg</span>` : '<span class="wk-pr-delta">First log!</span>'}
          </div>
        `).join('')}
      `;
    } else {
      prsEl.innerHTML = '';
    }

    modal.style.display = 'flex';

    // Refresh history in the background
    loadHistory();

    document.getElementById('wcDoneBtn').onclick = () => {
      modal.style.display = 'none';
    };
    document.getElementById('wcLiftsBtn').onclick = () => {
      modal.style.display = 'none';
      window.location.href = 'lifts.html';
    };
  }

  // Free workout button
  document.getElementById('startFreeBtn').addEventListener('click', () => startWorkout(0));

  // ── Utility ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  init();
})();
