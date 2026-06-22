const NAV_ITEMS = [
  { id: "dashboard", href: "dashboard.html", label: "Dashboard",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' },
  { id: "weight", href: "weight.html", label: "Body Weight",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6" stroke-linecap="round"/></svg>' },
  { id: "lifts", href: "lifts.html", label: "Lifts",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h2M18 12h2M6 8v8M18 8v8M9 12h6M9 6v12M15 6v12"/></svg>' },
  { id: "nutrition", href: "nutrition.html", label: "Nutrition",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 1-6 6 6 6 0 0 1-6-6c0-3 2-6 6-7 4 1 6 4 6 7Z"/><path d="M12 14v7"/></svg>' },
  { id: "analytics", href: "analytics.html", label: "Analytics",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19V9M11 19V4M18 19v-7"/></svg>' },
  { id: "profile", href: "profile.html", label: "Profile",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" stroke-linecap="round"/></svg>' },
];

// ── Barbell SVG used in brand and mobile nav ──────────────────────────────────
const BARBELL_SVG = `
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <rect x="1" y="8.75" width="18" height="2.5" rx="1.25" fill="#c9a84c"/>
    <rect x="6.5" y="8.75" width="7" height="2.5" rx="1.25" fill="#e0bc60"/>
    <rect x="1.2" y="5.5" width="2.8" height="9" rx="0.8" fill="#c0392b"/>
    <rect x="16" y="5.5" width="2.8" height="9" rx="0.8" fill="#c0392b"/>
    <rect x="5" y="7" width="1.2" height="6" rx="0.4" fill="#a07830"/>
    <rect x="13.8" y="7" width="1.2" height="6" rx="0.4" fill="#a07830"/>
  </svg>`;

// ── Mobile bottom nav HTML ────────────────────────────────────────────────────
function buildMobileNav(activeId) {
  const items = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="mobile-nav-link ${item.id === activeId ? 'active' : ''}" aria-label="${item.label}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join('');
  return `<nav class="mobile-nav" aria-label="Main navigation">${items}</nav>`;
}

// ── Loading overlay ───────────────────────────────────────────────────────────
function buildLoadingOverlay() {
  return `
    <div id="ironlog-loading" role="status" aria-label="Loading">
      <div class="ironlog-spinner"></div>
      <span class="ironlog-loading-text">Loading your stats…</span>
    </div>`;
}

// ── Hide loading overlay (call this when your page data is ready) ─────────────
window.hideLoading = function () {
  const overlay = document.getElementById('ironlog-loading');
  if (!overlay) return;
  overlay.classList.add('hidden');
  setTimeout(() => overlay.remove(), 350);
};

// Auto-hide: watch for real content appearing, fallback after 5s
function setupLoadingAutoHide() {
  const CONTENT_SELECTORS = [
    '.stats-card', '.log-entry', '.lift-row', '.chart-container',
    '#weightChart', '#dashStats', '.table-wrapper', '.entry-list',
    '[data-loaded]', '.card'
  ].join(', ');

  const observer = new MutationObserver(() => {
    if (document.querySelector(CONTENT_SELECTORS)) {
      window.hideLoading();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Hard fallback
  setTimeout(() => {
    window.hideLoading();
    observer.disconnect();
  }, 5000);
}

function renderShell(activeId, pageTitle, subtitle) {
  if (!Auth.isLoggedIn()) {
    window.location.href = "index.html";
    throw new Error("IRONLOG: not authenticated, redirecting to login.");
  }

  const navHtml = NAV_ITEMS.map(item => `
    <a class="nav-link ${item.id === activeId ? "active" : ""}" href="${item.href}">
      ${item.icon}<span>${item.label}</span>
    </a>
  `).join("");

  document.body.innerHTML = `
    ${buildLoadingOverlay()}

    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <a href="dashboard.html" class="brand-with-logo" aria-label="IRONLOG home">
            <span class="brand-logo-icon" aria-hidden="true">${BARBELL_SVG}</span>
            <div class="brand-text"><strong>IRONLOG</strong><span>Progress Analytics</span></div>
          </a>
          <button class="mobile-menu-btn" id="mobileMenuBtn" style="margin-left:auto;display:none;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
        <ul class="nav-list" id="navList">
          ${navHtml}
          <a class="nav-link nav-link-logout" id="logoutBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span>Log out</span>
          </a>
        </ul>
      </aside>
      <main class="main-content">
        <div class="page-header">
          <div>
            <h1>${pageTitle}</h1>
            <div class="subtitle" id="pageSubtitle" style="${subtitle ? "" : "display:none;"}">${subtitle || ""}</div>
          </div>
          <div id="pageHeaderActions"></div>
        </div>
        <div id="pageContent"></div>
      </main>
    </div>

    ${buildMobileNav(activeId)}
  `;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "index.html";
  });

  const menuBtn = document.getElementById("mobileMenuBtn");
  if (window.innerWidth <= 880) menuBtn.style.display = "flex";
  window.addEventListener("resize", () => {
    menuBtn.style.display = window.innerWidth <= 880 ? "flex" : "none";
  });
  menuBtn.addEventListener("click", () => {
    document.getElementById("navList").classList.toggle("open");
  });

  // Start auto-hide watcher
  setupLoadingAutoHide();
}
