// Points at the Render backend service defined in render.yaml (name: gym-progress-api).
// If Render had to rename your service (e.g. the name was taken), update this
// to match your actual backend URL from the Render dashboard, then redeploy.
window.IRONLOG_API_BASE = "https://gym-progress-api.onrender.com";

// For local development, comment the line above and uncomment this one:
// window.IRONLOG_API_BASE = "http://127.0.0.1:8000";
