// IRONLOG Service Worker
// Version bump this string whenever you deploy new frontend files
// so users get fresh content automatically.
const CACHE_NAME = 'ironlog-v1';
const STATIC_CACHE = 'ironlog-static-v1';
const API_CACHE = 'ironlog-api-v1';

// All frontend pages and assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/weight.html',
  '/lifts.html',
  '/nutrition.html',
  '/analytics.html',
  '/profile.html',
  '/css/style.css',
  '/js/config.js',
  '/js/api.js',
  '/js/layout.js',
  '/js/dashboard.js',
  '/js/weight.js',
  '/js/lifts.js',
  '/js/nutrition.js',
  '/js/analytics.js',
  '/js/profile.js',
  '/js/vendor/chart.umd.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install: pre-cache all static assets ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      // Use individual adds so one 404 doesn't abort the whole install
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first for API, cache-first for static ────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT/DELETE go straight to network)
  if (request.method !== 'GET') return;

  // Skip chrome-extension, data: URLs, etc.
  if (!url.protocol.startsWith('http')) return;

  // ── API requests: network-first, fall back to cached response ──────────────
  if (isApiRequest(url)) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // ── Static assets: cache-first, fall back to network ───────────────────────
  event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
});

function isApiRequest(url) {
  // Match your Render backend domain — adjust if your backend URL differs
  return (
    url.hostname.includes('onrender.com') ||
    url.hostname === '127.0.0.1' ||
    url.hostname === 'localhost' ||
    url.pathname.startsWith('/api/')
  );
}

// Network first: try network, on failure return cached version
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    // Only cache successful GET responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Network failed, serving from cache:', request.url);
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return a JSON error response so the app can show a useful message
    return new Response(
      JSON.stringify({ detail: 'You are offline. Please check your connection.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Cache first: return from cache if available, else fetch and cache
async function cacheFirstWithNetwork(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Return index.html for navigation requests (SPA fallback)
    if (request.mode === 'navigate') {
      const fallback = await cache.match('/index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

// ─── Background Sync (for offline log submissions) ───────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-logs') {
    event.waitUntil(syncPendingLogs());
  }
});

async function syncPendingLogs() {
  // Open the IndexedDB queue and replay any pending requests
  // This is called automatically when connectivity is restored
  try {
    const db = await openDB();
    const pending = await getAllPending(db);
    console.log('[SW] Syncing', pending.length, 'pending log(s)');

    for (const item of pending) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        if (response.ok) {
          await deletePending(db, item.id);
          console.log('[SW] Synced pending log:', item.id);
        }
      } catch (err) {
        console.warn('[SW] Still offline, will retry:', item.id);
      }
    }
  } catch (err) {
    console.error('[SW] Background sync failed:', err);
  }
}

// ─── Minimal IndexedDB helpers for offline queue ─────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ironlog-offline', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        const store = db.createObjectStore('pending', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllPending(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly');
    const req = tx.objectStore('pending').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deletePending(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite');
    const req = tx.objectStore('pending').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Push notifications (optional, for future use) ───────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'IRONLOG';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
