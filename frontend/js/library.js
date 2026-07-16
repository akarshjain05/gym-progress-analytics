document.addEventListener('DOMContentLoaded', async () => {
  renderShell('library', 'Exercise Library', 'Browse your exercises');
  
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="card">
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        <select id="libMuscleSelect" class="lib-search" style="margin-bottom:0; flex:1; min-width:130px;"></select>
        <select id="libCategorySelect" class="lib-search" style="margin-bottom:0; flex:1; min-width:130px;">
          <option value="">All Categories</option>
          <option value="compound">Compound</option>
          <option value="isolation">Isolation</option>
          <option value="bodyweight">Bodyweight</option>
        </select>
        <select id="libDifficultySelect" class="lib-search" style="margin-bottom:0; flex:1; min-width:130px;">
          <option value="">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select id="libEquipmentSelect" class="lib-search" style="margin-bottom:0; flex:1; min-width:130px;"></select>
        <input type="text" id="libSearch" class="lib-search" style="margin-bottom:0; flex:100%; min-width:200px;" placeholder="Search exercises...">
      </div>
      <div id="libContainer"></div>
    </div>
  `;

  let allExercises = [];
  const container = document.getElementById('libContainer');
  const searchInput = document.getElementById('libSearch');
  const muscleSelect = document.getElementById('libMuscleSelect');
  const categorySelect = document.getElementById('libCategorySelect');
  const difficultySelect = document.getElementById('libDifficultySelect');
  const equipmentSelect = document.getElementById('libEquipmentSelect');

  try {
    allExercises = await Api.listExercises();
    populateMuscleSelect(allExercises);
    populateEquipmentSelect(allExercises);
    renderLibrary(allExercises);
  } catch (err) {
    handleApiError(err);
    container.innerHTML = buildEmptyState('Failed to load', 'Could not load exercises.');
  }

  function applyFilters() {
    const q = searchInput.value.toLowerCase();
    const muscle = muscleSelect.value;
    const cat = categorySelect.value;
    const diff = difficultySelect.value;
    const equip = equipmentSelect.value;

    const filtered = allExercises.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(q) || (ex.muscle_group && ex.muscle_group.toLowerCase().includes(q));
      const matchMuscle = muscle ? (ex.muscle_group || 'other').toLowerCase() === muscle : true;
      const matchCat = cat ? (ex.category || '').toLowerCase() === cat : true;
      const matchDiff = diff ? (ex.difficulty || '').toLowerCase() === diff : true;
      const matchEquip = equip ? (ex.equipment || '').toLowerCase() === equip : true;

      return matchSearch && matchMuscle && matchCat && matchDiff && matchEquip;
    });
    renderLibrary(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  muscleSelect.addEventListener('change', applyFilters);
  categorySelect.addEventListener('change', applyFilters);
  difficultySelect.addEventListener('change', applyFilters);
  equipmentSelect.addEventListener('change', applyFilters);

  function populateEquipmentSelect(exercises) {
    const equipSet = new Set();
    exercises.forEach(e => {
      if (e.equipment) equipSet.add(e.equipment.toLowerCase());
    });
    const equipments = [...equipSet].sort();
    equipmentSelect.innerHTML = `<option value="">All Equipment</option>` + equipments.map(eq => 
      `<option value="${eq}">${capitalize(eq)}</option>`
    ).join('');
  }

  function populateMuscleSelect(exercises) {
    const MUSCLE_GROUP_ORDER = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "adductors", "legs", "biceps", "triceps", "abs", "calves", "forearms", "neck", "hip flexors", "full body"];
    const muscles = [...new Set(exercises.map(e => (e.muscle_group || 'other').toLowerCase()))];
    muscles.sort((a,b) => {
       const idxA = MUSCLE_GROUP_ORDER.indexOf(a);
       const idxB = MUSCLE_GROUP_ORDER.indexOf(b);
       if (idxA !== -1 && idxB !== -1) return idxA - idxB;
       if (idxA !== -1) return -1;
       if (idxB !== -1) return 1;
       return a.localeCompare(b);
    });
    muscleSelect.innerHTML = `<option value="">All Muscles</option>` + muscles.map(m => 
      `<option value="${m}">${capitalize(m)}</option>`
    ).join('');
  }

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
    const MUSCLE_GROUP_ORDER = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "adductors", "legs", "biceps", "triceps", "abs", "calves", "forearms", "neck", "hip flexors", "full body"];
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
