document.addEventListener("DOMContentLoaded", () => {
  renderShell("admin", "Admin Panel", "Manage the platform");
  const container = document.getElementById("pageContent");
  
  // Verify admin role first
  const me = Auth.getUser();
  if (!me || me.role !== "admin") {
    container.innerHTML = `<div class="alert alert-error">Access denied. You do not have admin privileges.</div>`;
    return;
  }

  container.innerHTML = `
    <!-- Tab bar -->
    <div class="profile-tabs mb-16">
      <button class="profile-tab active" data-tab="users">👥 Users</button>
      <button class="profile-tab" data-tab="stats">📊 Platform Stats</button>
      <button class="profile-tab" data-tab="logs">📜 Activity Logs</button>
    </div>

    <!-- Tab: Users -->
    <div id="tab-users" class="profile-tab-content">
      <div class="card">
        <div class="flex-between mb-16">
          <h2 style="margin:0;">Manage Users</h2>
          <button class="btn btn-secondary btn-sm" id="refreshUsersBtn">Refresh</button>
        </div>
        <div class="table-wrapper">
          <table class="table" style="width:100%">
            <thead>
              <tr>
                <th style="text-align:center;">ID</th>
                <th style="text-align:center;">Username</th>
                <th style="text-align:center;">Email</th>
                <th style="text-align:center;">Role</th>
                <th style="text-align:center;">Joined</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody">
              <tr><td colspan="6" style="text-align:center;padding:24px;">Loading users...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab: Stats -->
    <div id="tab-stats" class="profile-tab-content" style="display:none;">
      <div class="grid grid-3 mb-16" id="statsGrid">
        <div class="stat-card"><div class="stat-number">-</div><div class="stat-label">Loading...</div></div>
      </div>
    </div>

    <!-- Tab: Logs -->
    <div id="tab-logs" class="profile-tab-content" style="display:none;">
      <div class="card">
        <div class="flex-between mb-16">
          <h2 style="margin:0;">Recent Global Activity</h2>
          <button class="btn btn-secondary btn-sm" id="refreshLogsBtn">Refresh</button>
        </div>
        <div id="logsWrap">
          <div style="text-align:center;padding:24px;">Loading activity logs...</div>
        </div>
      </div>
    </div>
  `;

  // Tab switching logic
  document.querySelectorAll('.profile-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.profile-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById('tab-' + tabId).style.display = 'block';
      
      // Load specific data on demand
      if (tabId === 'stats') loadStats();
      if (tabId === 'logs') loadLogs();
    });
  });

  loadUsers();

  document.getElementById("refreshUsersBtn").addEventListener("click", loadUsers);
  document.getElementById("refreshLogsBtn").addEventListener("click", loadLogs);
});

// --- Users ---
async function loadUsers() {
  const tbody = document.getElementById("usersTableBody");
  try {
    const users = await Api.adminGetUsers();
    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;">No users found.</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="text-align:center; vertical-align:middle;">#${u.id}</td>
        <td style="text-align:center; vertical-align:middle;">${u.username || '<span class="text-secondary">Not set</span>'}</td>
        <td style="text-align:center; vertical-align:middle;">${u.email} ${u.email_verified ? '<span style="color:var(--success);font-size:12px;">(Verified)</span>' : ''}</td>
        <td style="text-align:center; vertical-align:middle;"><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}">${capitalize(u.role)}</span></td>
        <td style="text-align:center; vertical-align:middle;">${fmtDate(u.created_at.split("T")[0])}</td>
        <td style="text-align:center; vertical-align:middle;">
          <button class="btn btn-secondary btn-sm" onclick="promoteUser(${u.id}, '${u.username || u.email}')" ${u.role === 'admin' ? 'disabled' : ''}>Make Admin</button>
          <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, '${u.username || u.email}')" style="margin-left:4px;">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    handleApiError(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--error);">Failed to load users.</td></tr>`;
  }
}

window.promoteUser = async function(id, name) {
  const ok = await window.appConfirm("Promote User", `Are you sure you want to promote ${name} to admin?`, "Promote", "Cancel", "🛡️");
  if (!ok) return;
  try {
    const res = await Api.adminPromoteUser(id);
    showToast(res.message || "User promoted", "success");
    loadUsers();
  } catch (err) { handleApiError(err); }
};

window.deleteUser = async function(id, name) {
  const ok = await window.appConfirm("Delete User", `Are you sure you want to delete ${name}? This action cannot be undone.`, "Delete", "Cancel", "🗑️");
  if (!ok) return;
  try {
    const res = await Api.adminDeleteUser(id);
    showToast(res.message || "User deleted", "success");
    loadUsers();
  } catch (err) { handleApiError(err); }
};


// --- Stats ---
async function loadStats() {
  const grid = document.getElementById("statsGrid");
  try {
    const stats = await Api.adminGetStats();
    grid.innerHTML = `
      <div class="stat-card"><div class="stat-number">${stats.total_users}</div><div class="stat-label">Total Users</div></div>
      <div class="stat-card"><div class="stat-number">${stats.total_workouts}</div><div class="stat-label">Workouts Logged</div></div>
      <div class="stat-card"><div class="stat-number">${stats.total_goals}</div><div class="stat-label">Goals Set</div></div>
      <div class="stat-card"><div class="stat-number">${stats.total_lift_logs}</div><div class="stat-label">Lifts Logged</div></div>
      <div class="stat-card"><div class="stat-number">${stats.total_weight_logs}</div><div class="stat-label">Weigh-ins Logged</div></div>
    `;
  } catch(err) {
    handleApiError(err);
    grid.innerHTML = `<div class="alert alert-error">Failed to load platform stats.</div>`;
  }
}


// --- Logs ---
async function loadLogs() {
  const wrap = document.getElementById("logsWrap");
  try {
    const logs = await Api.adminGetLogs();
    if (!logs.length) {
      wrap.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-secondary)">No activity found.</div>`;
      return;
    }
    wrap.innerHTML = logs.map(l => `
      <div class="log-item">
        <div class="log-info">
          <div class="log-desc">${escapeHtml(l.description)}</div>
          <div class="log-meta">
            <span class="badge-log badge-log-${l.log_type}">${l.log_type}</span>
            <span>By <strong>${escapeHtml(l.username || l.email)}</strong></span>
            <span>• ${fmtDate(l.date)}</span>
          </div>
        </div>
        <button class="icon-btn icon-btn-danger" onclick="deleteAdminLog('${l.log_type}', ${l.log_id})" title="Delete Log">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2-2L4 6"/></svg>
        </button>
      </div>
    `).join("");
  } catch(err) {
    handleApiError(err);
    wrap.innerHTML = `<div class="alert alert-error">Failed to load activity logs.</div>`;
  }
}

window.deleteAdminLog = async function(type, id) {
  if (!confirm(`Delete this ${type} log? This action cannot be undone.`)) return;
  try {
    await Api.adminDeleteLog(type, id);
    showToast("Log deleted.", "success");
    loadLogs();
  } catch(err) { handleApiError(err); }
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
