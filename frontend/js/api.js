/* ===========================================================
   IRONLOG API client
   Set API_BASE_URL to your deployed Render backend URL.
   While developing locally with `uvicorn` on port 8000, the
   default below already works.
   =========================================================== */

const API_BASE_URL = (window.IRONLOG_API_BASE || "http://127.0.0.1:8000");

const Auth = {
  getToken() { return localStorage.getItem("ironlog_token"); },
  setToken(token) { localStorage.setItem("ironlog_token", token); },
  clear() { 
    localStorage.removeItem("ironlog_token"); 
    localStorage.removeItem("ironlog_user"); 
  },
  isLoggedIn() { return !!this.getToken(); },
  getUser() {
    const userJson = localStorage.getItem("ironlog_user");
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (e) {
      console.warn("Invalid user JSON in localStorage", e);
      return null;
    }
  },
  setUser(user) { localStorage.setItem("ironlog_user", JSON.stringify(user)); },
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// ── Offline Sync Logic (IndexedDB) ──────────────────────────────────────────
const OfflineSync = {
  db: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("ironlog_offline_db", 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      request.onerror = (e) => reject(e.target.error);
    });
  },
  async enqueue(path, method, headers, body, form) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      store.add({ path, method, headers, body, form, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async flush() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("queue", "readonly");
      const store = tx.objectStore("queue");
      const request = store.getAll();
      request.onsuccess = async () => {
        const items = request.result;
        if (items.length === 0) return resolve();
        console.log(`[OfflineSync] Flushing ${items.length} items to server...`);
        for (const item of items) {
          try {
            await fetch(`${API_BASE_URL}${item.path}`, {
              method: item.method,
              headers: item.headers,
              body: item.body === undefined ? undefined : (item.form ? item.body : JSON.stringify(item.body)),
            });
            // Delete from queue on success
            await new Promise((res) => {
              const delTx = this.db.transaction("queue", "readwrite");
              delTx.objectStore("queue").delete(item.id);
              delTx.oncomplete = res;
            });
          } catch (err) {
            console.warn(`[OfflineSync] Failed to sync item ${item.id}`, err);
            // Stop flushing if we hit a network error again
            break;
          }
        }
        if (window.showToast) window.showToast("Offline changes synced!");
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
};

window.addEventListener('online', () => {
  OfflineSync.flush().catch(console.error);
});
// Also try to flush on startup
OfflineSync.flush().catch(console.error);



async function apiRequest(path, { method = "GET", body, auth = true, form = false, _retry = false } = {}) {
  const headers = {};
  if (!form && body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = Auth.getToken();
    if (!token) {
      window.location.href = "index.html";
      throw new ApiError("Not authenticated", 401);
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  let resp;
  try {
    resp = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : (form ? body : JSON.stringify(body)),
      cache: method === 'GET' ? 'no-cache' : 'default',
    });
  } catch (networkErr) {
    if (method !== "GET" && auth) {
      await OfflineSync.enqueue(path, method, headers, body, form);
      if (window.showToast) window.showToast("You're offline. Saved locally and will sync later.");
      return { _offline: true, message: "Saved offline", id: "offline-" + Date.now() };
    }
    throw new ApiError("Can't reach the server. Check your connection or try again shortly.", 0);
  }

  if (resp.status === 401 && auth) {
    Auth.clear();
    window.location.href = "index.html";
    throw new ApiError("Session expired - please log in again.", 401);
  }

  if (resp.status === 204) return null;

  let data = null;
  const text = await resp.text();
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = text; }
  }

  if (!resp.ok) {
    const message = (data && data.detail) ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : `Request failed (${resp.status})`;
    throw new ApiError(message, resp.status);
  }

  return data;
}

// ─── EXPOSE apiRequest GLOBALLY ────────────────────────────────────────────
// This allows lifts.js, workout.js, coach.js, and onboarding.js to call
// apiRequest() directly instead of having to go through the Api object.
window.apiRequest = apiRequest;

const Api = {
  // --- auth ---
  register(username, email, password) {
    return apiRequest("/auth/register", { method: "POST", auth: false, body: { username, email, password } });
  },
  async login(username, password) {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    const data = await apiRequest("/auth/login", { method: "POST", auth: false, form: true, body: form });
    Auth.setToken(data.access_token);
    const user = await apiRequest("/profile/me");
    Auth.setUser(user);
    return user;
  },
  
  async logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST", auth: false });
    } catch (e) {
      console.warn("Logout request failed", e);
    }
    Auth.clear();
    window.location.href = "index.html";
  },

  // --- profile ---
  getProfile() { return apiRequest("/profile/me"); },
  updateProfile(payload) { return apiRequest("/profile/me", { method: "PUT", body: payload }); },

  // --- google sign-in / password reset ---
  async googleLogin(idToken) {
    const data = await apiRequest("/auth/google", { method: "POST", auth: false, body: { id_token: idToken } });
    if (!data.needs_setup && data.access_token) {
      Auth.setToken(data.access_token);
    }
    return data;
  },
  async completeGoogleSignup(setupToken, username, password) {
    const data = await apiRequest("/auth/complete-google-signup", {
      method: "POST", auth: false,
      body: { setup_token: setupToken, username, password },
    });
    if (data.access_token) {
      Auth.setToken(data.access_token);
    }
    return data;
  },
  forgotPassword(email) {
    return apiRequest("/auth/forgot-password", { method: "POST", auth: false, body: { email } });
  },
  resetPassword(token, newPassword) {
    return apiRequest("/auth/reset-password", { method: "POST", auth: false, body: { token, new_password: newPassword } });
  },
  resendVerification(email) {
    return apiRequest("/auth/resend-verification", { method: "POST", auth: false, body: { email } });
  },
  verifyEmail(token) {
    return apiRequest("/auth/verify-email", { method: "POST", auth: false, body: { token } });
  },

  // --- weight ---
  logWeight(payload) { return apiRequest("/weight", { method: "POST", body: payload }); },
  listWeight(params = {}) { return apiRequest(`/weight${qs(params)}`); },
  deleteWeight(id) { return apiRequest(`/weight/${id}`, { method: "DELETE" }); },
  weightSummary() { return apiRequest("/weight/summary"); },

  // --- exercises ---
  listExercises() { return apiRequest("/exercises"); },
  createExercise(payload) { return apiRequest("/exercises", { method: "POST", body: payload }); },
  deleteExercise(id) { return apiRequest(`/exercises/${id}`, { method: "DELETE" }); },

  // --- lifts ---
  logLift(payload) { return apiRequest("/lifts", { method: "POST", body: payload }); },
  logLiftSession(payload) { return apiRequest("/lifts/session", { method: "POST", body: payload }); },
  listLifts(params = {}) { return apiRequest(`/lifts${qs(params)}`); },
  updateLift(id, payload) { return apiRequest(`/lifts/${id}`, { method: "PUT", body: payload }); },
  deleteLift(id) { return apiRequest(`/lifts/${id}`, { method: "DELETE" }); },
  liftProgress(exerciseId) { return apiRequest(`/lifts/progress/${exerciseId}`); },
  personalRecords() { return apiRequest("/lifts/personal-records"); },

  // --- nutrition ---
  logCalories(payload) { return apiRequest("/nutrition", { method: "POST", body: payload }); },
  listCalories(params = {}) { return apiRequest(`/nutrition${qs(params)}`); },
  deleteCalorieLog(id) { return apiRequest(`/nutrition/${id}`, { method: "DELETE" }); },
  nutritionSummary() { return apiRequest("/nutrition/summary"); },

  // --- goals ---
  setGoal(payload) { return apiRequest("/goals", { method: "POST", body: payload }); },
  listGoals() { return apiRequest("/goals"); },
  deleteGoal(id) { return apiRequest(`/goals/${id}`, { method: "DELETE" }); },
  toggleGoalCompletion(id) { return apiRequest(`/goals/${id}/toggle-completion`, { method: "POST" }); },

  // --- analytics ---
  dashboard() { return apiRequest("/analytics/dashboard"); },
  insights() { return apiRequest("/analytics/insights"); },

  // --- workout templates ---
  listTemplates() { return apiRequest("/templates"); },
  getTemplate(id) { return apiRequest(`/templates/${id}`); },
  createTemplate(payload) { return apiRequest("/templates", { method: "POST", body: payload }); },
  updateTemplate(id, payload) { return apiRequest(`/templates/${id}`, { method: "PUT", body: payload }); },
  deleteTemplate(id) { return apiRequest(`/templates/${id}`, { method: "DELETE" }); },
  addTemplateExercise(templateId, payload) { return apiRequest(`/templates/${templateId}/exercises`, { method: "POST", body: payload }); },
  updateTemplateExercise(templateId, exerciseId, payload) { return apiRequest(`/templates/${templateId}/exercises/${exerciseId}`, { method: "PUT", body: payload }); },
  deleteTemplateExercise(templateId, exerciseId) { return apiRequest(`/templates/${templateId}/exercises/${exerciseId}`, { method: "DELETE" }); },
  reorderTemplateExercises(templateId, payload) { return apiRequest(`/templates/${templateId}/reorder`, { method: "POST", body: payload }); },
  finishWorkout(templateId, payload) { return apiRequest(`/templates/${templateId}/finish`, { method: "POST", body: payload }); },
  shareTemplate(id) { return apiRequest(`/templates/${id}/share`, { method: "POST" }); },
  getSharedTemplate(shareId) { return apiRequest(`/templates/shared/${shareId}`); },
  importSharedTemplate(shareId) { return apiRequest(`/templates/shared/${shareId}/import`, { method: "POST" }); },

  // --- coach ---
  getCoachAnalysis() { return apiRequest("/coach/analysis"); },
  getCoachAdvice() { return apiRequest("/coach/advice"); },

  // --- admin ---
  adminGetUsers() { return apiRequest("/admin/users"); },
  adminDeleteUser(id) { return apiRequest(`/admin/users/${id}`, { method: "DELETE" }); },
  adminPromoteUser(id) { return apiRequest(`/admin/promote/${id}`, { method: "POST" }); },
  adminGetStats() { return apiRequest("/admin/stats"); },
  adminGetLogs() { return apiRequest("/admin/logs"); },
  adminDeleteLog(type, id) { return apiRequest(`/admin/logs/${type}/${id}`, { method: "DELETE" }); },
};

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

// --- toasts ---
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function handleApiError(err, fallback = "Something went wrong. Try again.") {
  console.error(err);
  showToast(err instanceof ApiError ? err.message : fallback);
}

// --- custom modals ---
window.appAlert = function(title, message, icon = '⚠️') {
  return new Promise((resolve) => {
    let modal = document.getElementById('ironlogAlertModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ironlogAlertModal';
      modal.className = 'wk-modal-overlay';
      modal.style.zIndex = '9999';
      modal.innerHTML = `
        <div class="wk-modal" style="max-width:350px; text-align:center; padding-top:32px;">
          <div id="ironlogAlertIcon" style="font-size:40px; margin-bottom:16px;">⚠️</div>
          <h2 id="ironlogAlertTitle" style="font-size:20px; margin:0 0 12px 0;">Alert</h2>
          <div id="ironlogAlertMessage" style="color:#A0AEC0; font-size:15px; margin-bottom:24px;"></div>
          <div class="wk-modal-footer" id="ironlogAlertFooter" style="justify-content:center; gap:12px;">
            <button class="btn btn-secondary" id="ironlogAlertCancel" style="display:none;">Cancel</button>
            <button class="btn btn-primary" id="ironlogAlertOk">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    document.getElementById('ironlogAlertIcon').textContent = icon;
    document.getElementById('ironlogAlertTitle').textContent = title;
    document.getElementById('ironlogAlertMessage').textContent = message;
    document.getElementById('ironlogAlertCancel').style.display = 'none';
    
    document.getElementById('ironlogAlertOk').onclick = () => {
      modal.style.display = 'none';
      resolve(true);
    };
    
    modal.style.display = 'flex';
  });
};

window.appConfirm = function(title, message, okText = 'OK', cancelText = 'Cancel', icon = '❓') {
  return new Promise((resolve) => {
    let modal = document.getElementById('ironlogAlertModal');
    if (!modal) {
      window.appAlert(title, message, icon);
      modal = document.getElementById('ironlogAlertModal');
    } else {
      document.getElementById('ironlogAlertIcon').textContent = icon;
      document.getElementById('ironlogAlertTitle').textContent = title;
      document.getElementById('ironlogAlertMessage').textContent = message;
      modal.style.display = 'flex';
    }
    
    const cancelBtn = document.getElementById('ironlogAlertCancel');
    cancelBtn.style.display = 'block';
    cancelBtn.textContent = cancelText;
    
    const okBtn = document.getElementById('ironlogAlertOk');
    okBtn.textContent = okText;
    
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
      resolve(false);
    };
    
    okBtn.onclick = () => {
      modal.style.display = 'none';
      resolve(true);
    };
  });
};

// --- small formatting helpers used across pages ---
function fmtKg(v, decimals = 1) {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(decimals);
}

function fmtDelta(v, suffix = "") {
  if (v === null || v === undefined) return { text: "No trend yet", cls: "neutral" };
  const sign = v > 0 ? "+" : "";
  const cls = v > 0 ? "positive" : v < 0 ? "negative" : "neutral";
  return { text: `${sign}${v}${suffix}`, cls };
}

function fmtDate(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Sensible anatomical grouping order; anything not in this list (custom
// exercises with an unrecognized or missing muscle_group) is grouped
// under "Other" at the end.
const MUSCLE_GROUP_ORDER = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "quads", "hamstrings", "glutes", "calves", "core"];

function groupExercisesByMuscle(exercises) {
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

// Builds <optgroup> HTML grouped by muscle group, for any exercise <select>.
function buildGroupedExerciseOptions(exercises) {
  return groupExercisesByMuscle(exercises).map(g => `
    <optgroup label="${g.label}">
      ${g.items.map(e => `<option value="${e.id}">${e.name.replace(/</g, "&lt;")}</option>`).join("")}
    </optgroup>
  `).join("");
}