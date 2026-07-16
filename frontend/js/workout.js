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

          <div class="wk-add-exercise-row" style="flex-wrap: wrap; gap: 8px;">
            <select id="tmplAddMuscleSelect" class="wk-select" style="flex:1; min-width: 100px;"></select>
            <select id="tmplAddExerciseSelect" class="wk-select" style="flex:2; min-width: 150px;"></select>
            <button class="btn btn-secondary" id="tmplAddExBtn">+ Add</button>
            <button class="btn btn-secondary" id="tmplCustomExBtn">+ Custom</button>
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
        <div class="wk-complete-notes">
          <label class="wk-complete-notes-label">Session notes (optional)</label>
          <textarea id="wcNotes" class="wk-notes-input"
            placeholder="e.g. felt strong today, slept 8hrs, knee feeling good…"
            rows="3" maxlength="500"></textarea>
        </div>
        <div class="wk-modal-footer wk-complete-footer" style="flex-direction:column;gap:8px;">
          <button class="btn btn-primary wk-btn-full" id="wcSaveNotesBtn">Save &amp; Done</button>
          <button class="btn btn-secondary wk-btn-full" id="wcShareBtn" style="background:#3E7CB1;color:white;border-color:#3E7CB1;">📸 Share to IG Story</button>
          <button class="btn btn-secondary wk-btn-full" id="wcLiftsBtn">View in Lifts →</button>
        </div>
      </div>
    </div>

    <!-- ── History Detail Modal ────────────────────────────────────────── -->
    <div id="historyDetailModal" class="wk-modal-overlay" style="display:none;">
      <div class="wk-modal" style="max-height:90vh; overflow-y:auto;">
        <div class="wk-modal-header">
          <h2 id="hdTitle" style="font-size:18px; margin:0;">Workout Details</h2>
          <button class="wk-modal-close" id="closeHistoryDetailModal">✕</button>
        </div>
        <div class="wk-modal-body" id="hdBody">
          <!-- Content dynamically loaded -->
        </div>
      </div>
    </div>
  `;

  let workoutHistory = [];    // completed workout sessions

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

  // ── Load data ────────────────────────────────────────────────────────────
  async function init() {
    try {
      [exercises, templates] = await Promise.all([
        apiRequest('/exercises'),
        apiRequest('/templates'),
      ]);
      setupTwoStepSelector('tmplAddMuscleSelect', 'tmplAddExerciseSelect');
      renderTemplates();
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
      document.getElementById('historyLoading').style.display = 'none';
      document.getElementById('historyEmpty').style.display = 'flex';
    }
  }

  function setupTwoStepSelector(muscleSelId, exSelId) {
    const muscleSel = document.getElementById(muscleSelId);
    const exSel = document.getElementById(exSelId);
    if (!muscleSel || !exSel) return;
    
    const MUSCLE_ORDER = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "adductors", "legs", "biceps", "triceps", "abs", "calves", "forearms", "neck", "hip flexors", "full body"];
    
    const muscles = [...new Set(exercises.map(e => (e.muscle_group || 'other').toLowerCase()))];
    muscles.sort((a,b) => {
       const idxA = MUSCLE_ORDER.indexOf(a);
       const idxB = MUSCLE_ORDER.indexOf(b);
       if (idxA !== -1 && idxB !== -1) return idxA - idxB;
       if (idxA !== -1) return -1;
       if (idxB !== -1) return 1;
       return a.localeCompare(b);
    });
    
    muscleSel.innerHTML = `<option value="">All Muscles</option>` + muscles.map(m => 
      `<option value="${m}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`
    ).join('');
    
    exSel.innerHTML = buildGroupedExerciseOptions(exercises);
    
    muscleSel.addEventListener('change', () => {
       const val = muscleSel.value;
       if (!val) {
         exSel.innerHTML = buildGroupedExerciseOptions(exercises);
       } else {
         const filtered = exercises.filter(e => (e.muscle_group || 'other').toLowerCase() === val);
         exSel.innerHTML = filtered.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
       }
    });
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
          <div class="wk-tc-actions" style="position:relative;">
            <button class="wk-icon-btn wk-menu-btn" data-id="${t.id}">⋮</button>
            <div class="wk-dropdown-menu" id="wk-menu-${t.id}" style="display:none; position:absolute; right:0; top:24px; background:#1A1D21; border:1px solid #2D3748; border-radius:8px; overflow:hidden; z-index:10; box-shadow:0 4px 12px rgba(0,0,0,0.5); min-width:120px;">
              <button class="wk-dropdown-item wk-share-btn" data-id="${t.id}" style="width:100%; padding:10px 16px; text-align:left; background:transparent; border:none; color:#E2E8F0; cursor:pointer; font-size:14px;">Share</button>
              <button class="wk-dropdown-item wk-edit-btn" data-id="${t.id}" style="width:100%; padding:10px 16px; text-align:left; background:transparent; border:none; color:#E2E8F0; cursor:pointer; font-size:14px; border-top:1px solid #2D3748;">Edit</button>
              <button class="wk-dropdown-item wk-del-btn" data-id="${t.id}" style="width:100%; padding:10px 16px; text-align:left; background:transparent; border:none; color:#FC8181; cursor:pointer; font-size:14px; border-top:1px solid #2D3748;">Delete</button>
            </div>
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

    grid.querySelectorAll('.wk-start-btn').forEach(btn => {
      btn.addEventListener('click', () => startWorkout(parseInt(btn.dataset.id)));
    });
    grid.querySelectorAll('.wk-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const menu = document.getElementById(`wk-menu-${id}`);
        const isVisible = menu.style.display === 'block';
        document.querySelectorAll('.wk-dropdown-menu').forEach(m => m.style.display = 'none');
        if (!isVisible) menu.style.display = 'block';
      });
    });
    grid.querySelectorAll('.wk-share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); shareTemplate(parseInt(btn.dataset.id)); });
    });
    grid.querySelectorAll('.wk-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); openEditTemplate(parseInt(btn.dataset.id)); });
    });
    grid.querySelectorAll('.wk-del-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTemplate(parseInt(btn.dataset.id)); });
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

    const byDate = {};
    for (const s of workoutHistory) {
      if (!byDate[s.date]) byDate[s.date] = [];
      byDate[s.date].push(s);
    }

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
              <button class="wk-icon-btn wk-history-del" data-id="${s.id}" title="Delete" style="font-size: 16px;">✕</button>
            </div>
            <div class="wk-history-meta">
              <span>⏱ ${fmtDuration(s.duration_seconds)}</span>
              <span>💪 ${s.exercises_count} exercise${s.exercises_count !== 1 ? 's' : ''}</span>
              <span>📊 ${s.sets_count} set${s.sets_count !== 1 ? 's' : ''}</span>
            </div>
            ${s.notes ? `<div class="wk-history-notes">${escHtml(s.notes)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');

    list.querySelectorAll('.wk-history-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        showHistoryDetailModal(id);
      });
    });

    list.querySelectorAll('.wk-history-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const confirmed = await window.appConfirm('Delete Workout', 'Delete this workout record? This will also delete all logged sets from this session.', 'Delete', 'Cancel');
        if (!confirmed) return;
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

  async function showHistoryDetailModal(sessionId) {
    const modal = document.getElementById('historyDetailModal');
    const body = document.getElementById('hdBody');
    body.innerHTML = '<div class="ironlog-spinner" style="margin:40px auto;display:block;"></div>';
    modal.style.display = 'flex';

    try {
      const data = await apiRequest(`/templates/history/${sessionId}`);
      
      let html = `<div style="margin-bottom:16px; color:#A0AEC0; font-size:14px;">
        <div>⏱ ${fmtDuration(data.duration_seconds)}</div>
        <div>📅 ${fmtDate(data.date)}</div>
      </div>`;

      if (data.notes) {
        html += `<div style="padding:12px; background:#1A1D21; border-radius:8px; margin-bottom:16px; font-size:14px;">
          <strong style="color:#E2E8F0;display:block;margin-bottom:4px;">Session Notes:</strong>
          ${escHtml(data.notes)}
        </div>`;
      }

      data.exercises.forEach(ex => {
        html += `<div style="margin-bottom:20px;">
          <div style="font-weight:600; color:#E2E8F0; margin-bottom:8px;">${escHtml(ex.exercise_name)}</div>
          <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:left;">
            <thead>
              <tr style="color:#A0AEC0; border-bottom:1px solid #2D3748;">
                <th style="padding:4px 0;">Set</th>
                <th>kg</th>
                <th>Reps</th>
                <th>RPE</th>
              </tr>
            </thead>
            <tbody>
              ${ex.sets.map(s => `
                <tr style="border-bottom:1px solid #1A1D21;">
                  <td style="padding:8px 0; color:#E2E8F0;">${s.set_number}</td>
                  <td style="color:#E2E8F0;">${s.weight_kg}</td>
                  <td style="color:#E2E8F0;">${s.reps}</td>
                  <td style="color:#A0AEC0;">${s.rpe || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
      });
      
      if (data.exercises.length === 0) {
          html += `<div style="color:#A0AEC0; font-style:italic;">No logged sets found for this workout.</div>`;
      }
      
      html += `<div style="margin-top:24px; padding-top:16px; border-top:1px solid #2D3748;">
        <button class="btn btn-secondary wk-btn-full" id="historyShareBtn" style="background:#3E7CB1;color:white;border-color:#3E7CB1;width:100%;padding:12px;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:8px;">📸 Share to IG Story</button>
      </div>`;
      
      body.innerHTML = html;

      const durationStr = data.duration_seconds
        ? Math.floor(data.duration_seconds/60) + 'm ' + (data.duration_seconds%60) + 's'
        : '—';
        
      document.getElementById('historyShareBtn').onclick = () => {
        generateShareImage('historyShareBtn', {
          exercises_saved: data.exercises_count,
          total_sets_saved: data.sets_count,
          durationStr: durationStr,
          new_prs: [] 
        });
      };

    } catch (err) {
      body.innerHTML = `<div style="color:#FC8181; padding:20px;">Failed to load details.</div>`;
      handleApiError(err);
    }
  }

  // ── Create / Edit Template Modal ──────────────────────────────────────────
  let editingTemplateId = null;
  let tmplExercises = [];

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
        await apiRequest(`/templates/${editingTemplateId}`, {
          method: 'PUT', body: { name, description: desc || null },
        });
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
    const t = templates.find(x => x.id === id);
    const confirmed = await window.appConfirm('Delete Template', `Delete "${t?.name || 'this template'}"? This cannot be undone.`, 'Delete', 'Cancel');
    if (!confirmed) return;
    try {
      await apiRequest(`/templates/${id}`, { method: 'DELETE' });
      templates = templates.filter(t => t.id !== id);
      renderTemplates();
      showToast('Template deleted.');
    } catch (err) {
      handleApiError(err);
    }
  }

  async function shareTemplate(id) {
    try {
      const res = await Api.shareTemplate(id);
      const shareUrl = `${window.location.origin}/import.html?share_id=${res.share_id}`;
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Share link copied to clipboard!');
      } else {
        prompt('Copy this share link:', shareUrl);
      }
    } catch (err) {
      handleApiError(err);
    }
  }

  document.getElementById('closeTemplateModal').addEventListener('click', () => {
    document.getElementById('templateModal').style.display = 'none';
  });
  document.getElementById('cancelTemplateModal').addEventListener('click', () => {
    document.getElementById('templateModal').style.display = 'none';
  });
  document.getElementById('closeHistoryDetailModal').addEventListener('click', () => {
    document.getElementById('historyDetailModal').style.display = 'none';
  });
  document.getElementById('createTemplateBtn').addEventListener('click', openCreateTemplate);
  document.getElementById('createFirstBtn')?.addEventListener('click', openCreateTemplate);

  // ── Active Workout ─────────────────────────────────────────────────────────
  let awExercises = [];
  let awCurrentIdx = 0;
  let awStartTime = null;
  let awTimerInterval = null;
  let awRestInterval = null;
  let awTemplateId = 0;
  let awIsStarted = false;

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
      })) : [];

      awCurrentIdx = 0;
      awIsStarted = false;
      awStartTime = null;
      document.getElementById('awName').textContent = t ? t.name : 'Free Workout';
      
      const topBtn = document.getElementById('awFinishBtn');
      topBtn.className = 'wk-start-btn';
      topBtn.textContent = 'Start';
      document.getElementById('awTimer').textContent = '00:00';
      clearInterval(awTimerInterval);
      
      document.getElementById('activeWorkout').style.display = 'flex';
      document.body.style.overflow = 'hidden';

      renderAwTabs();
      renderAwPanel();
    } catch (err) {
      handleApiError(err);
    }
  }

  function startTimer() {
    clearInterval(awTimerInterval);
    awTimerInterval = setInterval(() => {
      if (!awIsStarted) return;
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
      const done = e.loggedSets.filter(Boolean).length >= e.target_sets;
      return `<button class="wk-tab ${i === awCurrentIdx ? 'active' : ''} ${done ? 'done' : ''}"
        data-idx="${i}">${i + 1}. ${e.exercise_name.split(' ').slice(0, 2).join(' ')}</button>`;
    }).join('');

    if (awTemplateId === 0) {
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
    const overlay = document.createElement('div');
    overlay.className = 'wk-quick-pick';
    overlay.innerHTML = `
      <div class="wk-quick-pick-box">
        <div class="wk-quick-pick-title">Add Exercise</div>
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <select id="qpMuscleSel" class="wk-select" style="flex:1;"></select>
        </div>
        <div style="display:flex; gap:8px; margin-bottom:16px;" id="qpSelectWrapper">
          <select id="qpExSel" class="wk-select" style="flex:1;"></select>
        </div>
      </div>`;
      
    const wrapper = overlay.querySelector('#qpSelectWrapper');
    
    const infoBtn = document.createElement('button');
    infoBtn.className = 'btn btn-secondary';
    infoBtn.style.padding = '0 12px';
    infoBtn.innerHTML = 'Info';
    infoBtn.onclick = () => {
      const exSel = document.getElementById('qpExSel');
      if(exSel.value) window.showExerciseInfo(parseInt(exSel.value));
    };
    wrapper.appendChild(infoBtn);
    
    const customBtn = document.createElement('button');
    customBtn.className = 'btn btn-secondary';
    customBtn.style.padding = '0 12px';
    customBtn.innerHTML = '+ Custom';
    customBtn.onclick = () => {
      if(window.showCustomExerciseModal) {
        window.showCustomExerciseModal(async (newEx) => {
          try {
            allExercises = await window.Api.listExercises();
            document.getElementById('qpMuscleSel').dispatchEvent(new Event('change'));
            setTimeout(() => {
              const exSel = document.getElementById('qpExSel');
              if (exSel) exSel.value = newEx.id;
            }, 100);
          } catch(e) { console.error(e); }
        });
      }
    };
    wrapper.appendChild(customBtn);

    const btnRow = document.createElement('div');
    btnRow.className = 'wk-modal-footer';
    btnRow.innerHTML = `<button class="btn btn-secondary" id="qpCancel">Cancel</button>
                        <button class="btn btn-primary" id="qpAdd">Add</button>`;
    overlay.querySelector('.wk-quick-pick-box').appendChild(btnRow);
    document.body.appendChild(overlay);

    setupTwoStepSelector('qpMuscleSel', 'qpExSel');

    document.getElementById('qpCancel').onclick = () => overlay.remove();
    document.getElementById('qpAdd').onclick = () => {
      const exSel = document.getElementById('qpExSel');
      if (!exSel.value) return;
      const id = parseInt(exSel.value);
      const name = exSel.options[exSel.selectedIndex]?.text || '';
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
    if (awExercises.length === 0) {
      panel.innerHTML = `
        <div class="wk-empty" style="margin-top:60px;">
          <div class="wk-empty-icon" style="font-size:48px;">💪</div>
          <h3 style="margin-top:16px;">Ready to train?</h3>
          <p style="color:var(--text-tertiary); margin-bottom: 24px;">Add your first exercise to get started.</p>
          <button class="btn btn-primary" id="awEmptyAddBtn" style="font-size:15px; padding: 10px 24px;">+ Add Exercise</button>
        </div>
      `;
      document.getElementById('awEmptyAddBtn')?.addEventListener('click', addExerciseToWorkout);
      return;
    }

    const ex = awExercises[awCurrentIdx];
    if (!ex) return;

    const isBodyweight = ['pull-up','chin-up','dip','hanging leg raise','plank'].includes(ex.exercise_name.toLowerCase());

    const setsHtml = Array.from({ length: ex.target_sets }, (_, i) => {
      const logged = ex.loggedSets[i];
      const isDone = !!logged;
      // Prefill weight: use logged value, then template target, then previous logged set
      const prefillWeight = logged
        ? logged.weight_kg
        : (ex.target_weight_kg != null
            ? ex.target_weight_kg
            : (i > 0 && ex.loggedSets[i - 1] ? ex.loggedSets[i - 1].weight_kg : ''));
      return `
        <div class="wk-set-row ${isDone ? 'done' : ''}" data-set="${i}">
          <div class="wk-set-num">Set ${i + 1}</div>
          ${isBodyweight ? '' : `
          <div class="wk-set-field">
            <label>Weight (kg)</label>
            <input type="number" class="wk-input aw-weight" data-set="${i}"
              value="${prefillWeight}"
              placeholder="${ex.target_weight_kg != null ? ex.target_weight_kg + ' kg' : 'kg'}"
              min="0.5" max="600" step="0.5"
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
        <div class="wk-panel-title" style="display:flex; align-items:center; justify-content:space-between;">
          <span>${escHtml(ex.exercise_name)}</span>
          <button class="btn btn-secondary btn-sm aw-info-btn" title="Exercise Info" data-id="${ex.exercise_id}">Info</button>
        </div>
        <div class="wk-panel-target">${ex.target_sets} sets × ${ex.target_reps} reps${ex.target_weight_kg ? ' @ ' + ex.target_weight_kg + 'kg' : ''}</div>
        <div class="wk-panel-progress">
          <div class="wk-panel-progress-bar" style="width:${Math.min(100,(ex.loggedSets.filter(Boolean).length/ex.target_sets)*100)}%"></div>
        </div>
        <div class="wk-panel-progress-txt">${ex.loggedSets.filter(Boolean).length}/${ex.target_sets} sets done</div>
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

    panel.querySelector('.aw-info-btn')?.addEventListener('click', (e) => {
      const exId = parseInt(e.currentTarget.dataset.id);
      if (exId && window.showExerciseInfo) {
        window.showExerciseInfo(exId);
      }
    });

    // Log set buttons — validate, auto-fill, no full re-render
    panel.querySelectorAll('.wk-log-set-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const setIdx = parseInt(btn.dataset.set);
        if (ex.loggedSets[setIdx]) return; // already logged

        const weightInput = panel.querySelector('.aw-weight[data-set="' + setIdx + '"]');
        const repsInput = panel.querySelector('.aw-reps[data-set="' + setIdx + '"]');
        const rpeInput = panel.querySelector('.aw-rpe[data-set="' + setIdx + '"]');

        const weight = isBodyweight ? 0 : (parseFloat(weightInput?.value) ?? 0);
        const reps = parseInt(repsInput?.value) || 0;
        const rpe = parseFloat(rpeInput?.value) || null;

        // Validate
        if (!isBodyweight && (isNaN(weight) || weight <= 0)) {
          showToast('Enter a weight greater than 0.', 'error');
          weightInput && weightInput.focus();
          return;
        }
        if (reps < 1) {
          showToast('Enter valid reps (at least 1).', 'error');
          repsInput && repsInput.focus();
          return;
        }

        ex.loggedSets[setIdx] = { weight_kg: weight, reps, rpe, completed: true };

        // Auto-fill weight into subsequent unlogged sets
        if (!isBodyweight && weight > 0) {
          for (let nextIdx = setIdx + 1; nextIdx < ex.target_sets; nextIdx++) {
            if (ex.loggedSets[nextIdx]) continue;
            const nextInput = panel.querySelector('.aw-weight[data-set="' + nextIdx + '"]');
            if (nextInput && !nextInput.disabled) nextInput.value = weight;
          }
        }

        // Update this row only — no full re-render so other inputs stay intact
        const setRow = panel.querySelector('.wk-set-row[data-set="' + setIdx + '"]');
        if (setRow) {
          setRow.classList.add('done');
          if (weightInput) weightInput.disabled = true;
          if (repsInput) repsInput.disabled = true;
          if (rpeInput) rpeInput.disabled = true;
          btn.classList.add('done');
          btn.textContent = '✓';
        }

        // Update progress bar and text
        const doneCount = ex.loggedSets.filter(Boolean).length;
        const progressBar = panel.querySelector('.wk-panel-progress-bar');
        const progressTxt = panel.querySelector('.wk-panel-progress-txt');
        if (progressBar) progressBar.style.width = Math.min(100, (doneCount / ex.target_sets) * 100) + '%';
        if (progressTxt) progressTxt.textContent = doneCount + '/' + ex.target_sets + ' sets done';

        // Update tabs
        renderAwTabs();

        // Rest timer or completion toast
        if (setIdx < ex.target_sets - 1) {
          startRestTimer(ex.rest_seconds || 90);
        } else {
          showToast('All sets done for ' + ex.exercise_name + '!');
        }
      });
    });

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
      if (barEl) barEl.style.width = (remaining / seconds * 100) + '%';
      if (remaining <= 0) {
        clearInterval(awRestInterval);
        if (timerEl) timerEl.style.display = 'none';
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 1000);

    document.getElementById('awRestSkip')?.addEventListener('click', () => {
      clearInterval(awRestInterval);
      timerEl.style.display = 'none';
    });
  }

  // ── Finish workout ─────────────────────────────────────────────────────────
  document.getElementById('awFinishBtn').addEventListener('click', async () => {
    if (!awIsStarted) {
      awIsStarted = true;
      awStartTime = Date.now();
      startTimer();
      const topBtn = document.getElementById('awFinishBtn');
      topBtn.className = 'wk-finish-btn';
      topBtn.textContent = 'Finish';
      return;
    }

    const confirmed = await window.appConfirm('Finish Workout', 'Finish workout? All logged sets will be saved.', 'Finish Workout', 'Keep Going');
    if (confirmed) {
      finishWorkout();
    }
  });

  async function finishWorkout() {
    if (awExercises.length === 0 || !awExercises.some(e => e.loggedSets.filter(Boolean).length > 0)) {
      const exitConfirmed = await window.appConfirm('Exit Workout', 'No sets logged. Exit without saving?', 'Exit', 'Keep Going');
      if (exitConfirmed) {
        closeWorkout();
      }
      return;
    }

    clearInterval(awTimerInterval);
    clearInterval(awRestInterval);

    if (!awIsStarted) {
      awIsStarted = true;
      awStartTime = Date.now();
    }

    const duration = Math.floor((Date.now() - awStartTime) / 1000);
    const today = new Date().toISOString().split('T')[0];

    const exercisesPayload = awExercises
      .filter(e => e.loggedSets.some(s => s && s.completed))
      .map(e => ({
        exercise_id: e.exercise_id,
        sets: e.loggedSets.filter(s => s && s.completed),
        notes: e.notes || null,
      }));

    if (!exercisesPayload.length) {
      window.appAlert('No Sets Logged', 'Please log at least one completed set before finishing the workout.');
      return;
    }

    const topBtn = document.getElementById('awFinishBtn');
    const btmBtn = document.getElementById('awFinishBtnBottom');
    
    if (topBtn) { topBtn.disabled = true; topBtn.textContent = 'Saving…'; }
    if (btmBtn) { btmBtn.disabled = true; btmBtn.textContent = 'Saving…'; }

    try {
      const endpoint = awTemplateId
        ? '/templates/' + awTemplateId + '/finish'
        : '/templates/free/finish';

      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: { date: today, duration_seconds: duration, exercises: exercisesPayload },
      });

      document.getElementById('activeWorkout').style.display = 'none';
      document.body.style.overflow = '';
      
      // Reset button states for future workouts
      if (topBtn) { topBtn.disabled = false; topBtn.textContent = 'Finish'; }
      if (btmBtn) { btmBtn.disabled = false; btmBtn.textContent = 'Finish Workout 🎉'; }
      
      showCompletionModal(result, duration);

    } catch (err) {
      handleApiError(err, 'Could not save workout.');
      if (topBtn) { topBtn.disabled = false; topBtn.textContent = 'Finish'; }
      if (btmBtn) { btmBtn.disabled = false; btmBtn.textContent = 'Finish Workout 🎉'; }
    }
  }

  function showCompletionModal(result, durationSeconds) {
    const modal = document.getElementById('workoutCompleteModal');
    const durationStr = durationSeconds
      ? Math.floor(durationSeconds/60) + 'm ' + (durationSeconds%60) + 's'
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
    loadHistory();

    // Save notes then close
    const saveAndClose = async () => {
      const notes = (document.getElementById('wcNotes')?.value || '').trim();
      // If user typed notes and we have a session ID, patch it
      if (notes && result.session_id) {
        try {
          await apiRequest('/templates/history/' + result.session_id + '/notes', {
            method: 'PATCH',
            body: { notes },
          });
        } catch (e) {
          console.warn('[workout] Could not save notes:', e);
        }
      }
      modal.style.display = 'none';
    };

    document.getElementById('wcSaveNotesBtn').onclick = saveAndClose;
    document.getElementById('wcLiftsBtn').onclick = () => {
      modal.style.display = 'none';
      window.location.href = 'lifts.html';
    };

    document.getElementById('wcShareBtn').onclick = () => {
      generateShareImage('wcShareBtn', {
        exercises_saved: result.exercises_saved,
        total_sets_saved: result.total_sets_saved,
        durationStr: durationStr,
        new_prs: result.new_prs
      });
    };
  }

  async function generateShareImage(btnId, data) {
    if (!window.html2canvas) {
      showToast("Sharing is loading, please try again in a second.");
      return;
    }
    
    const shareBtn = document.getElementById(btnId);
    const origText = shareBtn.innerHTML;
    shareBtn.innerHTML = "Generating Image...";
    shareBtn.disabled = true;

    // Create a temporary hidden container for the share image
    const shareContainer = document.createElement("div");
    shareContainer.style.position = "absolute";
    shareContainer.style.left = "-9999px";
    shareContainer.style.top = "-9999px";
    
    // The actual square card
    const card = document.createElement("div");
    card.style.width = "1080px";
    card.style.height = "1080px";
    card.style.background = "#15181B";
    card.style.color = "#F2F0EA";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.justifyContent = "center";
    card.style.alignItems = "center";
    card.style.fontFamily = "'Inter', sans-serif";
    card.style.padding = "80px";
    card.style.boxSizing = "border-box";
    card.style.backgroundImage = "radial-gradient(circle at 15% 0%, rgba(226,64,45,0.1), transparent 50%), radial-gradient(circle at 85% 100%, rgba(62,124,177,0.1), transparent 50%)";

    card.innerHTML = `
      <div style="font-size: 64px; font-weight: 800; font-family: 'Oswald', sans-serif; text-transform: uppercase; margin-bottom: 24px; color: #E2402D;">Workout Complete</div>
      <div style="font-size: 32px; color: #9CA5AC; margin-bottom: 80px;">${data.exercises_saved} Exercises • ${data.total_sets_saved} Sets • ${data.durationStr}</div>
      
      <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-bottom: auto;">
        ${data.new_prs && data.new_prs.length > 0 ? 
          data.new_prs.slice(0, 4).map(pr => `
            <div style="background: #1E2227; border-radius: 20px; padding: 40px; border: 2px solid rgba(242, 240, 234, 0.1);">
              <div style="font-size: 36px; font-weight: 700; margin-bottom: 16px;">${escHtml(pr.exercise)}</div>
              <div style="font-size: 48px; color: #D4A33B; font-weight: 800;">${pr.new_1rm_kg}kg <span style="font-size: 24px; color: #9CA5AC; font-weight: 400;">est. 1RM</span></div>
              <div style="color: #4F9D69; font-size: 28px; font-weight: 600; margin-top: 16px;">+${Math.round((pr.new_1rm_kg - (pr.old_1rm_kg||0))*10)/10}kg PR 🏆</div>
            </div>
          `).join('')
        : 
          `<div style="grid-column: span 2; text-align: center; color: #6B7480; font-size: 32px; font-style: italic; margin-top: 80px;">Another solid day in the books.</div>`
        }
      </div>
      
      <div style="display: flex; align-items: center; gap: 24px; margin-top: 60px;">
        <div style="width: 80px; height: 80px; background: #E2402D; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 32px; font-family: 'Oswald', sans-serif;">IL</div>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 2px;">IRONLOG</div>
      </div>
    `;
    
    shareContainer.appendChild(card);
    document.body.appendChild(shareContainer);

    try {
      const canvas = await html2canvas(card, {
        scale: 1, // 1080x1080 is large enough
        useCORS: true,
        backgroundColor: "#15181B"
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Failed to generate image blob");
        
        const file = new File([blob], 'ironlog-workout.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'IRONLOG Workout',
              text: 'Just crushed a workout on IRONLOG! 💪'
            });
          } catch (shareErr) {
            // Ignore AbortError when user cancels the share dialog
            if (shareErr.name !== 'AbortError') {
              console.error("Error sharing:", shareErr);
            }
          }
        } else {
          // Fallback to download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ironlog-workout.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
      
    } catch (e) {
      console.error("Error generating share image:", e);
      showToast("Couldn't generate image. Try again.");
    } finally {
      document.body.removeChild(shareContainer);
      shareBtn.innerHTML = origText;
      shareBtn.disabled = false;
    }
  }

  document.getElementById('startFreeBtn').addEventListener('click', () => startWorkout(0));

  // ── Utility ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  init();
})();

document.addEventListener('click', () => {
  document.querySelectorAll('.wk-dropdown-menu').forEach(m => m.style.display = 'none');
});
