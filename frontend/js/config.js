// Points at the backend service defined in .env
// Update this to match your actual backend URL from your environment, then redeploy.
window.IRONLOG_API_BASE = "/api";

// For local development, comment the line above and uncomment this one:
// window.IRONLOG_API_BASE = "http://127.0.0.1:8000";

// From Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID.
// Leave as-is (unset) to keep the app working without Google sign-in -
// the button just won't render until this is set.
window.IRONLOG_GOOGLE_CLIENT_ID = "614450704706-8n5dla8lbbji9edv96hpa3qdosq6us9k.apps.googleusercontent.com";