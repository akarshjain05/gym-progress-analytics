document.addEventListener('DOMContentLoaded', async () => {
  renderShell('library', 'Exercise Library', 'Browse your exercises');
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card">
      <input type="text" id="libSearch" class="lib-search" placeholder="Search exercises...">
      <div id="libContainer"></div>
    </div>
  `;

  let allExercises = [];
  const container = document.getElementById('libContainer');
  const searchInput = document.getElementById('libSearch');

  try {
    allExercises = await Api.listExercises();
    renderLibrary(allExercises);
  } catch (err) {
    handleApiError(err);
    container.innerHTML = buildEmptyState('Failed to load', 'Could not load exercises.');
  }

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allExercises.filter(ex => 
      ex.name.toLowerCase().includes(q) || 
      (ex.muscle_group && ex.muscle_group.toLowerCase().includes(q))
    );
    renderLibrary(filtered);
  });

  function renderLibrary(exercises) {
    if (exercises.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No exercises found.</p></div>`;
      return;
    }

    const groups = groupExercisesByMuscle(exercises);
    let html = '';
    
    groups.forEach(g => {
      html += `
        <div class="lib-group">
          <div class="lib-group-title">${g.label} (${g.items.length})</div>
          ${g.items.map(ex => {
            const equip = ex.equipment ? `<span style="opacity:0.7;"> • ${ex.equipment}</span>` : '';
            return `
            <div class="lib-item" onclick="window.showExerciseInfo(${ex.id})">
              <div>
                <div class="lib-item-name">${ex.name}</div>
                <div class="lib-item-meta">${capitalize(ex.category || 'Compound')}${equip}</div>
              </div>
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--text-tertiary);">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          `}).join('')}
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  
  // Re-use api.js groupExercisesByMuscle
  function groupExercisesByMuscle(exercises) {
    const MUSCLE_GROUP_ORDER = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "adductors", "legs", "biceps", "triceps", "core", "abs", "calves", "forearms", "neck", "hip flexors", "full body"];
    const groups = {};
    for (const e of exercises) {
      const key = e.muscle_group || "other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    const known = MUSCLE_GROUP_ORDER.filter(k => groups[k]);
    const unknown = Object.keys(groups).filter(k => !MUSCLE_GROUP_ORDER.includes(k)).sort();
    return [...known, ...unknown].map(key => ({ key, label: capitalize(key), items: groups[key] }));
  }
});
