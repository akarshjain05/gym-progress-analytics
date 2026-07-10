// Points at the Render backend service defined in render.yaml (name: gym-progress-api).
// If Render had to rename your service (e.g. the name was taken), update this
// to match your actual backend URL from the Render dashboard, then redeploy.
window.IRONLOG_API_BASE = window.location.protocol + "//" + window.location.hostname + ":8000";

// For local development, comment the line above and uncomment this one:
// window.IRONLOG_API_BASE = "http://127.0.0.1:8000";

// From Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID.
// Leave as-is (unset) to keep the app working without Google sign-in -
// the button just won't render until this is set.
window.IRONLOG_GOOGLE_CLIENT_ID = "614450704706-8n5dla8lbbji9edv96hpa3qdosq6us9k.apps.googleusercontent.com";