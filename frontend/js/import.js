document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const shareId = urlParams.get('share_id');
  
  if (!shareId) {
    document.getElementById('tplName').textContent = 'Invalid Link';
    document.getElementById('tplDesc').textContent = 'No share ID provided.';
    return;
  }

  let templateData = null;

  try {
    templateData = await Api.getSharedTemplate(shareId);
  } catch (err) {
    document.getElementById('tplName').textContent = 'Template Not Found';
    document.getElementById('tplDesc').textContent = 'This link might be invalid or the template was deleted.';
    return;
  }

  document.getElementById('tplName').textContent = templateData.name;
  document.getElementById('tplDesc').textContent = templateData.description || '';
  document.getElementById('tplCreator').textContent = `Created by @${templateData.creator_username}`;
  document.getElementById('tplCount').textContent = `${templateData.exercise_count} exercises`;

  const exContainer = document.getElementById('tplExercises');
  exContainer.innerHTML = templateData.exercises.map(ex => `
    <div class="import-ex">
      <div class="import-ex-name">${ex.exercise_name}</div>
      <div class="import-ex-meta">${ex.target_sets} sets × ${ex.target_reps} reps</div>
    </div>
  `).join('');

  const importBtn = document.getElementById('importBtn');
  importBtn.style.display = 'block';
  importBtn.disabled = false;

  importBtn.addEventListener('click', async () => {
    if (!Auth.isLoggedIn()) {
      sessionStorage.setItem('pending_import', shareId);
      window.location.href = `login.html?next=import.html?share_id=${shareId}`;
      return;
    }

    importBtn.disabled = true;
    importBtn.textContent = 'Importing...';

    try {
      await Api.importSharedTemplate(shareId);
      importBtn.textContent = 'Imported Successfully!';
      setTimeout(() => {
        window.location.href = 'workout.html';
      }, 1500);
    } catch (err) {
      importBtn.disabled = false;
      importBtn.textContent = 'Import to My Workouts';
      
      let msg = 'Failed to import template.';
      if (err.message && err.message.includes('cannot import your own')) {
        msg = 'You cannot import your own template!';
      }
      await window.appAlert('Import Error', msg);
    }
  });
});
