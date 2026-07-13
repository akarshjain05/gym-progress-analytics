document.addEventListener("DOMContentLoaded", () => {
  renderShell("admin", "Admin Panel", "Manage users and roles");
  const container = document.getElementById("pageContent");
  
  // Verify admin role first
  const me = Auth.getUser();
  if (!me || me.role !== "admin") {
    container.innerHTML = `<div class="alert alert-error">Access denied. You do not have admin privileges.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="flex-between mb-16">
        <h2 style="margin:0;">Users</h2>
        <button class="btn btn-secondary btn-sm" id="refreshUsersBtn">Refresh</button>
      </div>
      <div class="table-wrapper">
        <table class="table" style="width:100%">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            <tr><td colspan="6" style="text-align:center;padding:24px;">Loading users...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadUsers();

  document.getElementById("refreshUsersBtn").addEventListener("click", loadUsers);
});

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
        <td>#${u.id}</td>
        <td>${u.username || '<span class="text-secondary">Not set</span>'}</td>
        <td>${u.email} ${u.email_verified ? '<span style="color:var(--success);font-size:12px;">(Verified)</span>' : ''}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}">${capitalize(u.role)}</span></td>
        <td>${fmtDate(u.created_at.split("T")[0])}</td>
        <td>
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
  } catch (err) {
    handleApiError(err);
  }
};

window.deleteUser = async function(id, name) {
  const ok = await window.appConfirm("Delete User", `Are you sure you want to delete ${name}? This action cannot be undone.`, "Delete", "Cancel", "🗑️");
  if (!ok) return;

  try {
    const res = await Api.adminDeleteUser(id);
    showToast(res.message || "User deleted", "success");
    loadUsers();
  } catch (err) {
    handleApiError(err);
  }
};
