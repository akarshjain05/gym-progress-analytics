/* ===========================================================
   IRONLOG API client
   Set API_BASE_URL to your deployed backend URL.
   While developing locally with `uvicorn` on port 8000, the
   default below already works.
   =========================================================== */

const API_BASE_URL = (window.IRONLOG_API_BASE || "http://127.0.0.1:8000");

window.escapeHtml = function(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

window.setAlert = function(message, type = "error") {
  const alertSlot = document.getElementById("alertSlot");
  if (!alertSlot) return;
  const html = message ? `<div class="alert alert-${window.escapeHtml(type)}">${window.escapeHtml(message)}</div>` : "";
  if (typeof DOMPurify !== 'undefined') {
    alertSlot.innerHTML = DOMPurify.sanitize(html);
  } else {
    alertSlot.innerHTML = html;
  }
};
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
        console.log(`[OfflineSync] Flushing ${escapeHtml(items.length)} items to server...`);
        for (const item of items) {
          try {
            await fetch(`${escapeHtml(API_BASE_URL)}${escapeHtml(item.path)}`, {
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
            console.warn(`[OfflineSync] Failed to sync item ${escapeHtml(item.id)}`, err);
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
    headers["Authorization"] = `Bearer ${escapeHtml(token)}`;
  }

  let resp;
  try {
    resp = await fetch(`${escapeHtml(API_BASE_URL)}${escapeHtml(path)}`, {
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
    const message = (data && data.detail) ? (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)) : `Request failed (${escapeHtml(resp.status)})`;
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
  listWeight(params = {}) { return apiRequest(`/weight${escapeHtml(qs(params))}`); },
  deleteWeight(id) { return apiRequest(`/weight/${escapeHtml(id)}`, { method: "DELETE" }); },
  weightGet(start, end) {
    let url = "/weight";
    if (start && end) url += `?start=${escapeHtml(start)}&end=${escapeHtml(end)}`;
    return apiRequest(url);
  },
  weightSummary() { return apiRequest("/weight/summary"); },
  strengthPercentiles() { return apiRequest("/analytics/strength-percentiles"); },
  weightAdd(payload) { return apiRequest("/weight", { method: "POST", body: payload }); },
  weightDelete(id) { return apiRequest(`/weight/${escapeHtml(id)}`, { method: "DELETE" }); },

  // --- measurements ---
  measurementsGet(start, end) {
    let url = "/measurements";
    if (start && end) url += `?start=${escapeHtml(start)}&end=${escapeHtml(end)}`;
    return apiRequest(url);
  },
  measurementsAdd(payload) { return apiRequest("/measurements", { method: "POST", body: payload }); },
  measurementsDelete(id) { return apiRequest(`/measurements/${escapeHtml(id)}`, { method: "DELETE" }); },

  // --- exercises ---
  listExercises() { return apiRequest("/exercises"); },
  createExercise(payload) { return apiRequest("/exercises", { method: "POST", body: payload }); },
  deleteExercise(id) { return apiRequest(`/exercises/${escapeHtml(id)}`, { method: "DELETE" }); },

  // --- lifts ---
  logLift(payload) { return apiRequest("/lifts", { method: "POST", body: payload }); },
  logLiftSession(payload) { return apiRequest("/lifts/session", { method: "POST", body: payload }); },
  listLifts(params = {}) { return apiRequest(`/lifts${escapeHtml(qs(params))}`); },
  updateLift(id, payload) { return apiRequest(`/lifts/${escapeHtml(id)}`, { method: "PUT", body: payload }); },
  deleteLift(id) { return apiRequest(`/lifts/${escapeHtml(id)}`, { method: "DELETE" }); },
  liftProgress(exerciseId) { return apiRequest(`/lifts/progress/${escapeHtml(exerciseId)}`); },
  personalRecords() { return apiRequest("/lifts/personal-records"); },

  // --- nutrition ---
  logCalories(payload) { return apiRequest("/nutrition", { method: "POST", body: payload }); },
  listCalories(params = {}) { return apiRequest(`/nutrition${escapeHtml(qs(params))}`); },
  deleteCalorieLog(id) { return apiRequest(`/nutrition/${escapeHtml(id)}`, { method: "DELETE" }); },
  nutritionSummary() { return apiRequest("/nutrition/summary"); },

  // --- goals ---
  setGoal(payload) { return apiRequest("/goals", { method: "POST", body: payload }); },
  listGoals() { return apiRequest("/goals"); },
  deleteGoal(id) { return apiRequest(`/goals/${escapeHtml(id)}`, { method: "DELETE" }); },
  toggleGoalCompletion(id) { return apiRequest(`/goals/${escapeHtml(id)}/toggle-completion`, { method: "POST" }); },

  // --- analytics ---
  dashboard() { return apiRequest("/analytics/dashboard"); },
  nextEta() { return apiRequest("/coach/next-eta"); },
  insights() { return apiRequest("/analytics/insights"); },
  wrapped(year, month) {
    const q = new URLSearchParams();
    if (year) q.append("year", year);
    if (month) q.append("month", month);
    return apiRequest(`/analytics/wrapped?${escapeHtml(q.toString())}`);
  },
  compare(days) { return apiRequest(`/analytics/compare?days=${escapeHtml(days)}`); },

  // --- workout templates ---
  listTemplates() { return apiRequest("/templates"); },
  getTemplate(id) { return apiRequest(`/templates/${escapeHtml(id)}`); },
  createTemplate(payload) { return apiRequest("/templates", { method: "POST", body: payload }); },
  updateTemplate(id, payload) { return apiRequest(`/templates/${escapeHtml(id)}`, { method: "PUT", body: payload }); },
  deleteTemplate(id) { return apiRequest(`/templates/${escapeHtml(id)}`, { method: "DELETE" }); },
  addTemplateExercise(templateId, payload) { return apiRequest(`/templates/${escapeHtml(templateId)}/exercises`, { method: "POST", body: payload }); },
  updateTemplateExercise(templateId, exerciseId, payload) { return apiRequest(`/templates/${escapeHtml(templateId)}/exercises/${escapeHtml(exerciseId)}`, { method: "PUT", body: payload }); },
  deleteTemplateExercise(templateId, exerciseId) { return apiRequest(`/templates/${escapeHtml(templateId)}/exercises/${escapeHtml(exerciseId)}`, { method: "DELETE" }); },
  reorderTemplateExercises(templateId, payload) { return apiRequest(`/templates/${escapeHtml(templateId)}/reorder`, { method: "POST", body: payload }); },
  finishWorkout(templateId, payload) { return apiRequest(`/templates/${escapeHtml(templateId)}/finish`, { method: "POST", body: payload }); },
  shareTemplate(id) { return apiRequest(`/templates/${escapeHtml(id)}/share`, { method: "POST" }); },
  getSharedTemplate(shareId) { return apiRequest(`/templates/shared/${escapeHtml(shareId)}`); },
  importSharedTemplate(shareId) { return apiRequest(`/templates/shared/${escapeHtml(shareId)}/import`, { method: "POST" }); },

  // --- coach ---
  getCoachAnalysis() { return apiRequest("/coach/analysis"); },
  getCoachAdvice() { return apiRequest("/coach/advice"); },

  // --- admin ---
  adminGetUsers() { return apiRequest("/admin/users"); },
  adminDeleteUser(id) { return apiRequest(`/admin/users/${escapeHtml(id)}`, { method: "DELETE" }); },
  adminPromoteUser(id) { return apiRequest(`/admin/promote/${escapeHtml(id)}`, { method: "POST" }); },
  adminGetStats() { return apiRequest("/admin/stats"); },
  adminGetLogs() { return apiRequest("/admin/logs"); },
  adminDeleteLog(type, id) { return apiRequest(`/admin/logs/${escapeHtml(type)}/${escapeHtml(id)}`, { method: "DELETE" }); },

  Calculators: {
    getBodyMetrics(payload) { return apiRequest("/calculators/body-metrics", { method: "POST", body: payload }); },
    getPowerlifting(payload) { return apiRequest("/calculators/powerlifting", { method: "POST", body: payload }); },
    getMacros(payload) { return apiRequest("/calculators/macros", { method: "POST", body: payload }); }
  }
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
window.appAlert = function(title, message) {
  return new Promise((resolve) => {
    let modal = document.getElementById('ironlogAlertModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ironlogAlertModal';
      modal.className = 'wk-modal-overlay';
      modal.style.zIndex = '9999';
      modal.innerHTML = DOMPurify.sanitize(`
        <div class="wk-modal" style="max-width:350px; text-align:center; padding:32px 24px 24px;">
          <h2 id="ironlogAlertTitle" style="font-size:22px; font-weight:700; margin:0 0 12px 0;">Alert</h2>
          <div id="ironlogAlertMessage" style="color:#A0AEC0; font-size:15px; line-height:1.5; margin-bottom:32px;"></div>
          <div class="wk-modal-footer" id="ironlogAlertFooter" style="justify-content:center; gap:12px; padding:0; border-top:none;">
            <button class="btn btn-secondary" id="ironlogAlertCancel" style="display:none;">Cancel</button>
            <button class="btn btn-primary" id="ironlogAlertOk">OK</button>
          </div>
        </div>
      `);
      document.body.appendChild(modal);
    }
    
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

window.appConfirm = function(title, message, okText = 'OK', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    let modal = document.getElementById('ironlogAlertModal');
    if (!modal) {
      window.appAlert(title, message);
      modal = document.getElementById('ironlogAlertModal');
    } else {
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
  return { text: `${escapeHtml(sign)}${escapeHtml(v)}${escapeHtml(suffix)}`, cls };
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
const MUSCLE_GROUP_ORDER = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "adductors", "legs", "biceps", "triceps", "abs", "calves", "forearms", "neck", "hip flexors", "full body"];

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
    <optgroup label="${escapeHtml(g.label)}">
      ${g.items.map(e => `<option value="${e.id}">${escapeHtml(e.name.replace(/</g, "&lt;"))}</option>`).join("")}
    </optgroup>
  `).join("");
}