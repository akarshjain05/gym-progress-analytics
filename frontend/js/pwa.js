/**
 * pwa.js — IRONLOG Progressive Web App
 *
 * Include this script in every HTML page (before closing </body>):
 *   <script src="/js/pwa.js"></script>
 *
 * Handles:
 *  - Service worker registration
 *  - Install prompt (Add to Home Screen banner)
 *  - Offline/online status banner
 *  - iOS standalone detection & install hint
 */

(function () {
  'use strict';

  // ─── Service Worker Registration ──────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service worker registered, scope:', reg.scope);

          // Notify user when a new version is available
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                showUpdateBanner();
              }
            });
          });
        })
        .catch((err) => {
          console.error('[PWA] Service worker registration failed:', err);
        });

      // Reload the page when a new SW takes control (after user clicks update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }

  // ─── Install Prompt (Android / Desktop Chrome) ────────────────────────────
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallBanner();
    console.log('[PWA] App installed successfully');
  });

  function showInstallBanner() {
    // Don't show if already running as standalone PWA
    if (isStandalone()) return;
    // Don't show if user already dismissed in this session
    if (sessionStorage.getItem('ironlog-install-dismissed')) return;

    const banner = getOrCreateBanner('ironlog-install-banner', buildInstallBanner);
    banner.style.display = 'flex';
  }

  function hideInstallBanner() {
    const banner = document.getElementById('ironlog-install-banner');
    if (banner) banner.style.display = 'none';
  }

  function buildInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'ironlog-install-banner';
    banner.setAttribute('role', 'complementary');
    banner.setAttribute('aria-label', 'Install app');
    banner.innerHTML = `
      <div class="pwa-banner-content">
        <img src="/icons/icon-96.png" alt="IRONLOG" class="pwa-banner-icon">
        <div class="pwa-banner-text">
          <strong>Install IRONLOG</strong>
          <span>Add to home screen for the full app experience</span>
        </div>
        <div class="pwa-banner-actions">
          <button id="pwa-install-btn" class="pwa-btn-install">Install</button>
          <button id="pwa-dismiss-btn" class="pwa-btn-dismiss" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install prompt outcome:', outcome);
      deferredPrompt = null;
      hideInstallBanner();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      hideInstallBanner();
      sessionStorage.setItem('ironlog-install-dismissed', '1');
    });

    return banner;
  }

  // ─── iOS Install Hint ─────────────────────────────────────────────────────
  // iOS Safari doesn't fire beforeinstallprompt, so we show a manual hint
  function showIOSHint() {
    if (!isIOS() || isStandalone()) return;
    if (localStorage.getItem('ironlog-ios-hint-shown')) return;

    const hint = document.createElement('div');
    hint.id = 'ironlog-ios-hint';
    hint.innerHTML = `
      <div class="pwa-banner-content">
        <img src="/icons/icon-96.png" alt="IRONLOG" class="pwa-banner-icon">
        <div class="pwa-banner-text">
          <strong>Install IRONLOG on iOS</strong>
          <span>Tap <strong>Share ⎙</strong> then <strong>"Add to Home Screen"</strong></span>
        </div>
        <button id="pwa-ios-dismiss" class="pwa-btn-dismiss" aria-label="Dismiss">✕</button>
      </div>
    `;
    hint.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
      background: var(--surface, #2a2f35);
      border-top: 2px solid var(--plate-red, #c0392b);
      display: flex; padding: 12px 16px;
    `;
    document.body.appendChild(hint);

    document.getElementById('pwa-ios-dismiss').addEventListener('click', () => {
      hint.remove();
      localStorage.setItem('ironlog-ios-hint-shown', '1');
    });
  }

  // ─── Offline / Online Banner ──────────────────────────────────────────────
  function showOfflineBanner() {
    let banner = document.getElementById('ironlog-offline-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ironlog-offline-banner';
      banner.innerHTML = `
        <span>⚠️ You're offline — data will sync when you reconnect.</span>
      `;
      banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
        background: #e67e22; color: #fff; text-align: center;
        padding: 8px 16px; font-size: 14px; font-family: Inter, sans-serif;
      `;
      document.body.appendChild(banner);
    }
    banner.style.display = 'block';
  }

  function hideOfflineBanner() {
    const banner = document.getElementById('ironlog-offline-banner');
    if (banner) banner.style.display = 'none';
  }

  window.addEventListener('offline', () => {
    showOfflineBanner();
    console.log('[PWA] Gone offline');
  });

  window.addEventListener('online', () => {
    hideOfflineBanner();
    console.log('[PWA] Back online');
    // Trigger background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.sync.register('sync-pending-logs').catch(console.warn);
      });
    }
  });

  // Show offline banner on load if already offline
  if (!navigator.onLine) showOfflineBanner();

  // ─── Update Banner ────────────────────────────────────────────────────────
  function showUpdateBanner() {
    const banner = document.createElement('div');
    banner.id = 'ironlog-update-banner';
    banner.innerHTML = `
      <span>🔄 A new version of IRONLOG is available.</span>
      <button id="pwa-update-btn" class="pwa-btn-install" style="margin-left:12px">Update Now</button>
    `;
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
      background: var(--plate-blue, #2980b9); color: #fff;
      text-align: center; padding: 8px 16px;
      font-size: 14px; font-family: Inter, sans-serif;
      display: flex; align-items: center; justify-content: center;
    `;
    document.body.appendChild(banner);

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      // Tell the waiting SW to take control
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function getOrCreateBanner(id, buildFn) {
    let el = document.getElementById(id);
    if (!el) el = buildFn();
    return el;
  }

  // Run iOS hint after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showIOSHint);
  } else {
    showIOSHint();
  }

})();
