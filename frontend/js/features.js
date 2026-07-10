/**
 * features.js — IRONLOG Feature Utilities
 *
 * Provides:
 *   1. Theme toggle (dark/light) — IronlogTheme
 *   2. Push notifications      — IronlogPush
 *   3. Data export             — IronlogExport
 *
 * Include AFTER api.js on all inner pages:
 *   <script src="js/features.js"></script>
 */

// ============================================================
// 1. THEME TOGGLE
// ============================================================
const IronlogTheme = (function () {
  const KEY = 'ironlog_theme';
  const ROOT = document.documentElement;

  function apply(theme) {
    ROOT.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }

  function current() {
    return localStorage.getItem(KEY) || 'dark';
  }

  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark');
    // Update all toggle buttons on the page
    document.querySelectorAll('[data-theme-toggle]').forEach(updateBtn);
    // Update Chart.js defaults so existing charts re-render with correct colors
    updateChartDefaults();
  }

  function updateChartDefaults() {
    if (typeof Chart === 'undefined') return;
    const isDark = current() === 'dark';
    const tickColor = isDark ? '#6b7280' : '#78716c';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    Chart.defaults.color = isDark ? '#a09880' : '#57534e';
    Chart.defaults.borderColor = gridColor;
    // Re-render all active charts
    Object.values(Chart.instances || {}).forEach(chart => {
      try {
        if (chart.options.scales) {
          Object.values(chart.options.scales).forEach(scale => {
            if (scale.ticks) scale.ticks.color = tickColor;
            if (scale.grid) scale.grid.color = gridColor;
          });
        }
        chart.update('none'); // 'none' = no animation
      } catch(e) {}
    });
  }

  function updateBtn(btn) {
    const isDark = current() === 'dark';
    btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.innerHTML = isDark
      ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
           <circle cx="12" cy="12" r="5"/>
           <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
         </svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
           <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
         </svg>`;
  }

  // Apply on load + set chart defaults immediately
  apply(current());
  // Defer chart defaults until Chart.js is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateChartDefaults);
  } else {
    setTimeout(updateChartDefaults, 0);
  }

  return { toggle, current, apply, updateBtn, updateChartDefaults };
})();


// ============================================================
// 2. PUSH NOTIFICATIONS
// ============================================================
const IronlogPush = (function () {
  const KEY = 'ironlog_push_dismissed';

  async function getVapidKey() {
    try {
      const res = await apiRequest('/push/vapid-public-key');
      return res.public_key || null;
    } catch {
      return null;
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
  }

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, reason: 'Push not supported in this browser.' };
    }

    const vapidKey = await getVapidKey();
    if (!vapidKey) {
      return { ok: false, reason: 'Push not configured on server.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { ok: false, reason: 'Notification permission denied.' };
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();
      await apiRequest('/push/subscribe', {
        method: 'POST',
        body: {
          endpoint: subJson.endpoint,
          keys: { p256dh: subJson.keys.p256dh, auth: subJson.keys.auth },
        },
      });

      return { ok: true };
    } catch (err) {
      console.error('[push] Subscribe error:', err);
      return { ok: false, reason: err.message };
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await apiRequest('/push/unsubscribe', { method: 'DELETE' });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async function isSubscribed() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  async function sendTest() {
    try {
      await apiRequest('/push/test', { method: 'POST' });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  return { subscribe, unsubscribe, isSubscribed, sendTest, isSupported };
})();


// ============================================================
// 3. DATA EXPORT
// ============================================================
const IronlogExport = (function () {
  function download(format) {
    // Use fetch with auth token to get the file, then trigger download
    const token = Auth.getToken();
    if (!token) { showToast('Please log in to export data.', 'error'); return; }

    const url = `${window.IRONLOG_API_BASE}/export/${format}`;
    showToast(`Preparing your ${format.toUpperCase()} export…`);

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="([^"]+)"/);
        const filename = match ? match[1] : `ironlog_export.${format}`;
        return res.blob().then(blob => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        showToast(`Downloaded ${filename}`);
      })
      .catch(err => {
        console.error('[export]', err);
        showToast('Export failed. Please try again.', 'error');
      });
  }

  return { download };
})();