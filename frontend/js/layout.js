const ICON_STYLE = 'width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"';

const NAV_ITEMS = [
  { id: "dashboard", href: "dashboard.html", label: "Dashboard",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <rect x="14" y="3" width="7" height="11" rx="1.5" fill="currentColor" />
      <rect x="14" y="16" width="7" height="5" rx="1.5" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <rect x="3" y="12" width="7" height="9" rx="1.5" fill="currentColor" />
    </svg>` },
  { id: "weight", href: "weight.html", label: "Body Weight",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="currentColor"/>
      <path d="M9 13h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>` },
  { id: "measurements", href: "measurements.html", label: "Measurements",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <path d="M3 12h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6 12v-3M10 12v-2M14 12v-3M18 12v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>` },
  { id: "lifts", href: "lifts.html", label: "Lifts",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <path d="M6 5v14M18 5v14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="2" y="8" width="4" height="8" rx="1" fill="currentColor" />
      <rect x="18" y="8" width="4" height="8" rx="1" fill="currentColor" />
      <path d="M6 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>` },
  { id: "workout", href: "workout.html", label: "Workouts",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="5" y="4" width="14" height="17" rx="2" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M9 2h6v3H9V2Z" fill="currentColor"/>
      <path d="M9 10h6M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>` },
  { id: "nutrition", href: "nutrition.html", label: "Nutrition",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M12 21a9 9 0 0 0 9-9c0-1.5-.5-3-1.5-4H4.5C3.5 9 3 10.5 3 12a9 9 0 0 0 9 9Z" fill="currentColor"/>
      <path d="M12 3v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>` },
  { id: "goals", href: "goals.html", label: "Goals",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>` },
  { id: "analytics", href: "analytics.html", label: "Analytics",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="4" y="13" width="4" height="7" rx="1" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <rect x="10" y="7" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="16" y="3" width="4" height="17" rx="1" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
    </svg>` },
  { id: "calculators", href: "calculators.html", label: "Calculators",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 8h8v2H8V8z" fill="currentColor"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>` },
  { id: "coach", href: "coach.html", label: "AI Coach",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="4" y="8" width="16" height="12" rx="3" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M9 14h.01M15 14h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M12 8V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
      <path d="M2 13h2M20 13h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>` },
  { id: "profile", href: "profile.html", label: "Profile",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M5 20c0-2.5 2-5 7-5s7 2.5 7 5" fill="currentColor" />
    </svg>` },
  { id: "library", href: "library.html", label: "Exercise Library",
    icon: `<svg ${ICON_STYLE} viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 4v16M16 4v16" stroke="currentColor" stroke-width="1.5"/>
      <path d="M4 12h4M16 12h4" stroke="currentColor" stroke-width="1.5"/>
    </svg>` },
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

function buildEmptyState(title, message, ctaText, ctaHref) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
        </svg>
      </div>
      <h3>${title}</h3>
      <p>${message}</p>
      ${ctaText ? `<a href="${ctaHref}" class="btn btn-primary">${ctaText}</a>` : ''}
    </div>
  `;
}

// ── Loading overlay ───────────────────────────────────────────────────────────
function buildLoadingOverlay() {
  return `<div id="ironlog-loading" role="status" aria-label="Loading" class="hidden">
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
  // Skeleton is now explicitly hidden by each page's JS once data finishes loading.
  // We keep a fallback timeout just in case an error prevents hideLoading from firing.
  setTimeout(() => { window.hideLoading && window.hideLoading(); }, 5000);
}

// ── Mobile drawer nav ─────────────────────────────────────────────────────────
function buildMobileDrawer(activeId) {
  const user = Auth.getUser() || {};
  let navLinks = NAV_ITEMS.filter(item => item.id !== 'profile').map(item => `
    <a class="drawer-link ${item.id === activeId ? 'active' : ''}" href="${item.href}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join('');

  if (user.role === 'admin') {
    navLinks += `
      <a class="drawer-link ${activeId === 'admin' ? 'active' : ''}" href="admin.html">
        <svg width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 4L4 8l8 4 8-4-8-4z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
          <path d="M4 12l8 4 8-4M4 16l8 4 8-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Admin Panel</span>
      </a>
    `;
  }

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

      <div class="drawer-footer sidebar-footer" style="padding: 16px 20px; padding-bottom: calc(16px + var(--safe-bottom)); border-top: 1px solid rgba(255,255,255,0.07); margin-top: 0;">
        <a href="profile.html" class="sidebar-profile-link" title="Profile">
          <div class="sidebar-avatar">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
        </a>
        <button class="sidebar-logout-btn" id="drawerLogoutBtn" title="Log out">
          ${LOGOUT_ICON}
          <span>Log out</span>
        </button>
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
  const BOTTOM_NAV_IDS = ['dashboard', 'lifts', 'workout', 'analytics', 'profile'];
  let bottomItems = NAV_ITEMS.filter(i => BOTTOM_NAV_IDS.includes(i.id));
  


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
    throw new Error("IRONLOG: not authenticated, redirecting to home.");
  }

  const user = Auth.getUser() || {};
  const isCollapsed = user.sidebar_collapsed ? "sidebar-collapsed" : "";

  let navHtml = NAV_ITEMS.filter(item => item.id !== 'profile').map(item => `
    <a class="nav-link ${item.id === activeId ? "active" : ""}" href="${item.href}">
      ${item.icon}<span>${item.label}</span>
    </a>
  `).join("");

  if (user.role === 'admin') {
    navHtml += `
      <a class="nav-link ${activeId === 'admin' ? "active" : ""}" href="admin.html">
        <svg ${ICON_STYLE} viewBox="0 0 24 24">
          <path d="M12 4L4 8l8 4 8-4-8-4z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/>
          <path d="M4 12l8 4 8-4M4 16l8 4 8-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg><span>Admin Panel</span>
      </a>
    `;
  }

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
        </ul>
        <div class="sidebar-footer">
          <a href="profile.html" class="sidebar-profile-link" title="Profile">
            <div class="sidebar-avatar">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
          </a>
          <button class="sidebar-logout-btn" id="logoutBtn" title="Log out">
            ${LOGOUT_ICON}
            <span>Log out</span>
          </button>
        </div>
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
      nutrition: "nutrition", analytics: "analytics",
      library: "lifts", workout: "workout", coach: "coach",
      profile: "generic", admin: "generic", goals: "generic",
      measurements: "generic", calculators: "generic"
    };
    const skPage = skeletonMap[activeId] || "generic";
    if (skPage) {
      window.Skeleton.show(skPage);
    }
  }
  setupLoadingAutoHide();
}

window.showExerciseInfo = async function(exerciseId) {
  try {
    const exercises = await Api.listExercises();
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    
    let modal = document.getElementById('exerciseInfoModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'exerciseInfoModal';
      modal.className = 'wk-modal-overlay';
      modal.style.zIndex = '9999';
      document.body.appendChild(modal);
    }
    
    const difficultyBadge = ex.difficulty 
      ? `<span style="display:inline-block; padding:2px 8px; border-radius:12px; background:var(--bg-tertiary); font-size:12px; margin-left:8px;">${ex.difficulty}</span>` 
      : '';
      
    modal.innerHTML = `
      <div class="wk-modal" style="max-width:500px;">
        <div class="wk-modal-header">
          <div class="wk-modal-title" style="display:flex; align-items:center;">
            ${ex.name} ${difficultyBadge}
          </div>
          <button class="wk-modal-close" onclick="document.getElementById('exerciseInfoModal').style.display='none'">${CLOSE_ICON}</button>
        </div>
        <div class="wk-modal-body" style="line-height:1.5;">
          <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
            <div style="background:var(--bg-tertiary); padding:6px 12px; border-radius:6px; font-size:13px;">
              <strong style="color:var(--text-secondary);">Category:</strong><br>${ex.category || '—'}
            </div>
            <div style="background:var(--bg-tertiary); padding:6px 12px; border-radius:6px; font-size:13px;">
              <strong style="color:var(--text-secondary);">Primary Muscle:</strong><br>${ex.muscle_group || '—'}
            </div>
            <div style="background:var(--bg-tertiary); padding:6px 12px; border-radius:6px; font-size:13px;">
              <strong style="color:var(--text-secondary);">Secondary Muscle:</strong><br>${ex.secondary_muscle || '—'}
            </div>
            <div style="background:var(--bg-tertiary); padding:6px 12px; border-radius:6px; font-size:13px;">
              <strong style="color:var(--text-secondary);">Equipment:</strong><br>${ex.equipment || '—'}
            </div>
          </div>
          
          <h4 style="margin:0 0 8px 0; color:var(--text-primary);">Instructions</h4>
          <div style="color:var(--text-secondary); font-size:14px; white-space:pre-wrap;">${ex.instructions || 'No instructions available.'}</div>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  } catch (err) {
    console.error("Failed to load exercise info", err);
  }
};

window.showCustomExerciseModal = function(onSuccess) {
  let modal = document.getElementById('globalCustomExerciseModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'globalCustomExerciseModal';
    modal.className = 'wk-modal-overlay';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
      <div class="wk-modal" style="max-width:500px;">
        <div class="wk-modal-header">
          <span class="wk-modal-title">Add custom exercise</span>
          <button class="wk-modal-close" id="closeGlobalCustomModal">✕</button>
        </div>
        <div class="wk-modal-body" style="padding-right: 8px;">
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Exercise name</label>
            <input type="text" id="gCustomName" class="wk-input" placeholder="e.g. Cable Lateral Raise" maxlength="80">
          </div>
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Muscle group (optional)</label>
            <select id="gCustomMuscle" class="wk-select">
              <option value="">Select…</option>
              <option value="chest">Chest</option>
              <option value="back">Back</option>
              <option value="shoulders">Shoulders</option>
              <option value="quads">Quads</option>
              <option value="hamstrings">Hamstrings</option>
              <option value="glutes">Glutes</option>
              <option value="adductors">Adductors</option>
              <option value="legs">Legs</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
              <option value="abs">Abs</option>
              <option value="calves">Calves</option>
              <option value="forearms">Forearms</option>
              <option value="neck">Neck</option>
              <option value="hip flexors">Hip Flexors</option>
              <option value="full body">Full Body</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Category (optional)</label>
            <select id="gCustomCategory" class="wk-select">
              <option value="">Select…</option>
              <option value="compound">Compound</option>
              <option value="isolation">Isolation</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
          </div>
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Secondary Muscle (optional)</label>
            <input type="text" id="gCustomSecondaryMuscle" class="wk-input" placeholder="e.g. Triceps, Front Delt">
          </div>
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Equipment (optional)</label>
            <input type="text" id="gCustomEquipment" class="wk-input" placeholder="e.g. Dumbbell, Machine">
          </div>
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Difficulty (optional)</label>
            <select id="gCustomDifficulty" class="wk-select">
              <option value="">Select…</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div class="wk-field" style="margin-bottom:12px;">
            <label class="wk-label">Instructions (optional)</label>
            <textarea id="gCustomInstructions" class="wk-input" placeholder="How to perform..." rows="2"></textarea>
          </div>
        </div>
        <div class="wk-modal-footer">
          <button class="btn btn-secondary" id="cancelGlobalCustom">Cancel</button>
          <button class="btn btn-primary" id="submitGlobalCustom">Add exercise</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('closeGlobalCustomModal').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('cancelGlobalCustom').addEventListener('click', () => modal.style.display = 'none');
  }
  
  // reset fields
  document.getElementById('gCustomName').value = '';
  document.getElementById('gCustomMuscle').value = '';
  document.getElementById('gCustomCategory').value = '';
  document.getElementById('gCustomSecondaryMuscle').value = '';
  document.getElementById('gCustomEquipment').value = '';
  document.getElementById('gCustomDifficulty').value = '';
  document.getElementById('gCustomInstructions').value = '';
  
  const submitBtn = document.getElementById('submitGlobalCustom');
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  
  newSubmitBtn.addEventListener('click', async () => {
      const name = document.getElementById('gCustomName').value.trim();
      const muscle_group = document.getElementById('gCustomMuscle').value || null;
      const category = document.getElementById('gCustomCategory').value || null;
      const secondary_muscle = document.getElementById('gCustomSecondaryMuscle').value.trim() || null;
      const equipment = document.getElementById('gCustomEquipment').value.trim() || null;
      const difficulty = document.getElementById('gCustomDifficulty').value || null;
      const instructions = document.getElementById('gCustomInstructions').value.trim() || null;
      
      if (!name) {
        window.showToast?.('Exercise name is required.', 'error');
        return;
      }
      
      const payload = {
        name, muscle_group, category, secondary_muscle, equipment, difficulty, instructions,
        is_bodyweight: false
      };
      
      newSubmitBtn.disabled = true;
      newSubmitBtn.textContent = 'Saving...';
      
      try {
        const result = await window.apiRequest('/exercises/custom', { method: 'POST', body: payload });
        if(window.showToast) window.showToast('Custom exercise created!');
        modal.style.display = 'none';
        if (typeof onSuccess === 'function') onSuccess(result);
      } catch (err) {
        if(window.handleApiError) window.handleApiError(err);
      } finally {
        newSubmitBtn.disabled = false;
        newSubmitBtn.textContent = 'Add exercise';
      }
  });

  modal.style.display = 'flex';
};