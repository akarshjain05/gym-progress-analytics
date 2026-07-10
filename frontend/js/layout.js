const NAV_ITEMS = [
  { id: "dashboard", href: "dashboard.html", label: "Dashboard",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' },
  { id: "weight", href: "weight.html", label: "Body Weight",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6" stroke-linecap="round"/></svg>' },
  { id: "lifts", href: "lifts.html", label: "Lifts",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h2M18 12h2M6 8v8M18 8v8M9 12h6M9 6v12M15 6v12"/></svg>' },
  { id: "workout", href: "workout.html", label: "Workouts",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/></svg>' },
  { id: "nutrition", href: "nutrition.html", label: "Nutrition",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8a6 6 0 0 1-6 6 6 6 0 0 1-6-6c0-3 2-6 6-7 4 1 6 4 6 7Z"/><path d="M12 14v7"/></svg>' },
  { id: "analytics", href: "analytics.html", label: "Analytics",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19V9M11 19V4M18 19v-7"/></svg>' },
  { id: "coach", href: "coach.html", label: "AI Coach",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 2.83V13M12 17h.01"/></svg>' },
  { id: "profile", href: "profile.html", label: "Profile",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" stroke-linecap="round"/></svg>' },
];

const BARBELL_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M2 12h20"/>
  <path d="M4 8v8"/>
  <path d="M20 8v8"/>
  <path d="M7 9v6"/>
  <path d="M17 9v6"/>
</svg>`;

const HAMBURGER_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M4 6h16M4 12h16M4 18h16"/>
</svg>`;

const CLOSE_ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M18 6L6 18M6 6l12 12"/>
</svg>`;

const LOGOUT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
</svg>`;

// ── Loading overlay ───────────────────────────────────────────────────────────
function buildLoadingOverlay() {
  return `<div id="ironlog-loading" role="status" aria-label="Loading">
    <div class="ironlog-spinner"></div>
    <span class="ironlog-loading-text">Loading your stats…</span>
  </div>`;
}

window.hideLoading = function () {
  const overlay = document.getElementById('ironlog-loading');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 350);
  }
  if (window.Skeleton) {
    window.Skeleton.hide();
  }
};

function setupLoadingAutoHide() {
  const SELECTORS = '.stats-card,.log-entry,.lift-row,.chart-container,#weightChart,#dashStats,.table-wrapper,.entry-list,[data-loaded],.card,.dash-grid,.stat-value';
  const observer = new MutationObserver(() => {
    const elements = document.querySelectorAll(SELECTORS);
    const hasReal = Array.from(elements).some(el => !el.closest('.hidden-by-skeleton'));
    if (hasReal) {
      window.hideLoading();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { window.hideLoading(); observer.disconnect(); }, 5000);
}

// ── Mobile drawer nav ─────────────────────────────────────────────────────────
function buildMobileDrawer(activeId) {
  const navLinks = NAV_ITEMS.map(item => `
    <a class="drawer-link ${item.id === activeId ? 'active' : ''}" href="${item.href}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join('');

  return `
    <!-- Overlay backdrop -->
    <div id="drawer-backdrop" class="drawer-backdrop" aria-hidden="true"></div>

    <!-- Slide-in drawer -->
    <div id="mobile-drawer" class="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div class="drawer-header">
        <div class="drawer-brand">
          <span class="brand-logo-icon" aria-hidden="true">${BARBELL_SVG}</span>
          <div class="drawer-brand-text">
            <strong>IRONLOG</strong>
            <span>Progress Analytics</span>
          </div>
        </div>
        <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close menu">
          ${CLOSE_ICON}
        </button>
      </div>

      <nav class="drawer-nav">
        ${navLinks}
      </nav>

      <div class="drawer-footer">
        <a class="drawer-link drawer-link-profile ${activeId === 'profile' ? 'active' : ''}" href="profile.html">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" stroke-linecap="round"/></svg>
          <span>Profile</span>
        </a>
        <a class="drawer-link drawer-link-logout" id="drawerLogoutBtn">
          ${LOGOUT_ICON}
          <span>Log out</span>
        </a>
      </div>
    </div>

    <!-- Mobile top bar (only visible on mobile) -->
    <header class="mobile-topbar">
      <button class="hamburger-btn" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false">
        ${HAMBURGER_ICON}
      </button>
      <a href="dashboard.html" class="mobile-topbar-brand">
        <span class="brand-logo-icon" aria-hidden="true">${BARBELL_SVG}</span>
        <span class="mobile-brand-name">IRONLOG</span>
      </a>
      <div class="mobile-topbar-spacer"></div>
    </header>
  `;
}

// ── Bottom nav (5 main items only, no profile — it's in drawer) ───────────────
function buildBottomNav(activeId) {
  const bottomItems = NAV_ITEMS.filter(i => i.id !== 'profile');
  const links = bottomItems.map(item => `
    <a href="${item.href}" class="bottom-nav-link ${item.id === activeId ? 'active' : ''}" aria-label="${item.label}">
      ${item.icon}
      <span>${item.label === 'Body Weight' ? 'Weight' : item.label}</span>
    </a>
  `).join('');

  return `<nav class="mobile-bottom-nav" aria-label="Quick navigation">${links}</nav>`;
}

function openDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const btn = document.getElementById('hamburgerBtn');
  if (!drawer) return;
  drawer.classList.add('open');
  backdrop.classList.add('open');
  btn && btn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const btn = document.getElementById('hamburgerBtn');
  if (!drawer) return;
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  btn && btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
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

  const user = Auth.getUser() || {};
  const isCollapsed = user.sidebar_collapsed ? "sidebar-collapsed" : "";

  document.body.innerHTML = `
    ${buildLoadingOverlay()}
    ${buildMobileDrawer(activeId)}

    <div class="app-shell ${isCollapsed}">
      <aside class="sidebar">
        <div class="brand">
          <a href="dashboard.html" class="brand-with-logo" aria-label="IRONLOG home">
            <span class="brand-logo-icon" aria-hidden="true">${BARBELL_SVG}</span>
            <div class="brand-text"><strong>IRONLOG</strong><span>Progress Analytics</span></div>
          </a>
        </div>
        <button class="sidebar-toggle-btn" id="sidebarToggleBtn" aria-label="Toggle Sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <ul class="nav-list" id="navList">
          ${navHtml}
          <a class="nav-link nav-link-logout" id="logoutBtn">
            ${LOGOUT_ICON}
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

    ${buildBottomNav(activeId)}
  `;

  // Desktop logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "index.html";
  });

  // Desktop sidebar toggle
  const toggleBtn = document.getElementById("sidebarToggleBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", async () => {
      const shell = document.querySelector(".app-shell");
      const collapsed = shell.classList.toggle("sidebar-collapsed");
      
      const currentUser = Auth.getUser();
      if (currentUser) {
        currentUser.sidebar_collapsed = collapsed;
        localStorage.setItem("ironlog_user", JSON.stringify(currentUser));
      }
      
      try {
        await window.apiRequest("/profile/me", {
          method: "PUT",
          body: { sidebar_collapsed: collapsed }
        });
      } catch (err) {
        console.error("Failed to sync sidebar state", err);
      }
    });
  }

  // Theme is toggled from Profile → Settings tab only

  // Hamburger open
  document.getElementById("hamburgerBtn").addEventListener("click", openDrawer);

  // Close button
  document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);

  // Backdrop click closes
  document.getElementById("drawer-backdrop").addEventListener("click", closeDrawer);

  // Drawer logout
  document.getElementById("drawerLogoutBtn").addEventListener("click", () => {
    Auth.clear();
    window.location.href = "index.html";
  });

  // Close drawer on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // Show skeleton screen while data loads
  if (window.Skeleton) {
    const skeletonMap = {
      dashboard: "dashboard", weight: "weight", lifts: "lifts",
      nutrition: "nutrition", analytics: "analytics", workout: null,
    };
    const skPage = skeletonMap[activeId];
    if (skPage) {
      requestAnimationFrame(() => window.Skeleton.show(skPage));
    }
  }

  setupLoadingAutoHide();
}