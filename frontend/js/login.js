if (Auth.isLoggedIn()) window.location.href = "dashboard.html";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const completeGoogleForm = document.getElementById("completeGoogleForm");
const authSwitchWrap = document.getElementById("authSwitchWrap");
const alertSlot = document.getElementById("alertSlot");

function setAlert(message, type = "error") {
  alertSlot.innerHTML = message ? `<div class="alert alert-${type}">${message}</div>` : "";
}

document.getElementById("switchToRegister").addEventListener("click", () => {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  document.getElementById("switchToRegisterWrap").style.display = "none";
  document.getElementById("switchToLoginWrap").style.display = "inline";
  setAlert("");
});
document.getElementById("switchToLogin").addEventListener("click", () => {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  document.getElementById("switchToLoginWrap").style.display = "none";
  document.getElementById("switchToRegisterWrap").style.display = "inline";
  setAlert("");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAlert("");
  const btn = document.getElementById("loginSubmitBtn");
  btn.disabled = true; btn.textContent = "Logging in…";
  try {
    await Api.login(loginForm.username.value.trim(), loginForm.password.value);
    const urlParams = new URLSearchParams(window.location.search);
    window.location.href = urlParams.get("next") || "dashboard.html";
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes("verify your email")) {
      alertSlot.innerHTML = `<div class="alert alert-error">${err.message} <br><a href="#" id="resendVerificationLink" style="font-weight:600;margin-top:8px;display:inline-block;">Resend verification email</a></div>`;
      document.getElementById("resendVerificationLink").addEventListener("click", async (ev) => {
        ev.preventDefault();
        try {
          const res = await Api.resendVerification(loginForm.username.value.trim());
          setAlert(res.message || "Verification email sent.", "success");
        } catch (rErr) {
          setAlert(rErr.message || "Failed to resend email.");
        }
      });
    } else {
      setAlert(err.message || "Login failed.");
    }
    btn.disabled = false; btn.textContent = "Log in";
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAlert("");
  const btn = document.getElementById("registerSubmitBtn");
  btn.disabled = true; btn.textContent = "Creating account…";
  try {
    await Api.register(registerForm.username.value.trim(), registerForm.email.value.trim(), registerForm.password.value);
    setAlert("Account created! Please check your email to verify your account before logging in.", "success");
    registerForm.reset();
    btn.disabled = false; btn.textContent = "Create account";
  } catch (err) {
    setAlert(err.message || "Couldn't create account.");
    btn.disabled = false; btn.textContent = "Create account";
  }
});

let pendingSetupToken = null;

async function handleGoogleCredentialResponse(response) {
  setAlert("");
  try {
    const result = await Api.googleLogin(response.credential);
    if (result.needs_setup) {
      pendingSetupToken = result.setup_token;
      document.getElementById("completeGoogleEmail").textContent = result.email;
      loginForm.style.display = "none";
      registerForm.style.display = "none";
      authSwitchWrap.style.display = "none";
      document.getElementById("googleAuthSection").style.display = "none";
      completeGoogleForm.style.display = "block";
    } else {
      Auth.setToken(result.access_token);
      const user = await Api.getProfile();
      Auth.setUser(user);
      const urlParams = new URLSearchParams(window.location.search);
      window.location.href = urlParams.get("next") || "dashboard.html";
    }
  } catch (err) {
    setAlert(err.message || "Google sign-in failed.");
  }
}
window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;

completeGoogleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setAlert("");
  const btn = document.getElementById("completeGoogleSubmitBtn");
  btn.disabled = true; btn.textContent = "Finishing up…";
  try {
    const username = document.getElementById("cgUsername").value.trim();
    const password = document.getElementById("cgPassword").value;
    const result = await Api.completeGoogleSignup(pendingSetupToken, username, password);
    Auth.setToken(result.access_token);
    const user = await Api.getProfile();
    Auth.setUser(user);
    const urlParams = new URLSearchParams(window.location.search);
    window.location.href = urlParams.get("next") || "dashboard.html";
  } catch (err) {
    setAlert(err.message || "Couldn't finish setting up your account.");
    btn.disabled = false; btn.textContent = "Finish setting up";
  }
});

function initGoogleSignIn() {
  const clientId = window.IRONLOG_GOOGLE_CLIENT_ID;
  if (!clientId) return;
  if (typeof google === "undefined" || !google.accounts) return;
  document.getElementById("googleAuthSection").style.display = "block";
  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredentialResponse,
  });
  var btnContainer = document.getElementById("googleSignInBtn");
  var btnWidth = btnContainer.offsetWidth || 320;
  google.accounts.id.renderButton(btnContainer, {
    theme: "outline", 
    size: "large", 
    width: btnWidth, 
    type: "standard",
    shape: "rectangular"
  });
}
window.addEventListener("load", () => setTimeout(initGoogleSignIn, 300));
