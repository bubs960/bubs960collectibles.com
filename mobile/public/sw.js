/* FigurePinner service worker — minimal cache-first shell.
 *
 * What this does (v1):
 *   - Caches the app shell (JS bundle + HTML + manifest + icons) on
 *     first install so subsequent visits boot offline.
 *   - Network-first for /api/* calls so prices stay fresh; falls
 *     back to cache only on offline.
 *   - Cache-busts when the SW version changes (bump CACHE_VERSION
 *     below to invalidate all old shells on a release).
 *
 * What this does NOT do:
 *   - No web push (deferred to v3 — needs VAPID + a separate worker
 *     route per CHANGELOG Phase 13 note).
 *   - No background sync. Tauri-wrapped binary has the OS to handle
 *     that anyway.
 *   - No precaching of figure images. The HTTP cache + the SWR
 *     layer in src/cache/useSWR.ts already handles per-figure
 *     persistence; doubling up would waste storage.
 */

const CACHE_VERSION = 'fp-shell-v1';
const SHELL_URLS = ['/', '/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Wipe old cache versions so a release doesn't strand users on
  // stale chunks.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first. Fall back to cache only on offline.
  // Prices change; we don't want to serve a 24h-old comp out of cache
  // when a network request would succeed.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Only cache GETs (POSTs to /api/v1/analytics/event etc.
          // should never be cached).
          if (event.request.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error())),
    );
    return;
  }

  // App shell: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok && event.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
    }),
  );
});
