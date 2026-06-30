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
  clear() { localStorage.removeItem("ironlog_token"); localStorage.removeItem("ironlog_user"); },
  isLoggedIn() { return !!this.getToken(); },
  getUser() {
    const raw = localStorage.getItem("ironlog_user");
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) { localStorage.setItem("ironlog_user", JSON.stringify(user)); },
};

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiRequest(path, { method = "GET", body, auth = true, form = false } = {}) {
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
    });
  } catch (networkErr) {
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

  // --- profile ---
  getProfile() { return apiRequest("/profile/me"); },
  updateProfile(payload) { return apiRequest("/profile/me", { method: "PUT", body: payload }); },

  // --- google sign-in / password reset ---
  googleLogin(idToken) {
    return apiRequest("/auth/google", { method: "POST", auth: false, body: { id_token: idToken } });
  },
  completeGoogleSignup(setupToken, username, password) {
    return apiRequest("/auth/complete-google-signup", {
      method: "POST", auth: false,
      body: { setup_token: setupToken, username, password },
    });
  },
  forgotPassword(email) {
    return apiRequest("/auth/forgot-password", { method: "POST", auth: false, body: { email } });
  },
  resetPassword(token, newPassword) {
    return apiRequest("/auth/reset-password", { method: "POST", auth: false, body: { token, new_password: newPassword } });
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
  deleteLift(id) { return apiRequest(`/lifts/${id}`, { method: "DELETE" }); },
  liftProgress(exerciseId) { return apiRequest(`/lifts/progress/${exerciseId}`); },
  personalRecords() { return apiRequest("/lifts/personal-records"); },

  // --- nutrition ---
  logCalories(payload) { return apiRequest("/nutrition", { method: "POST", body: payload }); },
  listCalories(params = {}) { return apiRequest(`/nutrition${qs(params)}`); },
  deleteCalorieLog(id) { return apiRequest(`/nutrition/${id}`, { method: "DELETE" }); },
  nutritionSummary() { return apiRequest("/nutrition/summary"); },

  // --- goals ---
  setLiftGoal(payload) { return apiRequest("/goals", { method: "POST", body: payload }); },
  listLiftGoals() { return apiRequest("/goals"); },
  deleteLiftGoal(id) { return apiRequest(`/goals/${id}`, { method: "DELETE" }); },

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

  // --- coach ---
  getCoachAnalysis() { return apiRequest("/coach/analysis"); },
  getCoachAdvice() { return apiRequest("/coach/advice"); },
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