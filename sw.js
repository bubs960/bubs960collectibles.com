// Bubs960 360 Spin Maker — service worker
// Scope: site root. Only intercepts the spin-maker URL and its hard
// dependencies (logo + JSZip). Everything else falls through to the
// browser's default network behaviour, so this SW won't interfere with
// the main bubs960collectibles.com pages.
//
// Strategy:
//   * /360-spin.html  → network-first, cache-fallback (always pick up
//     new versions when online; works offline once installed).
//   * /bubs-logo.jpg, JSZip CDN → cache-first (rarely change, cut load
//     time and let the page run on a plane).
//
// Bump CACHE_VERSION when you ship breaking changes so old caches get
// thrown away on the next visit.

const CACHE_VERSION = 'v2'; // bump when shipping breaking changes
const CACHE_NAME = `bubs960-spin-${CACHE_VERSION}`;

const PRECACHE = [
    '/360-spin.html',
    '/manifest.json',
    '/bubs-logo.jpg',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isSpinPage = url.pathname === '/360-spin.html';
    const isAsset =
        url.pathname === '/bubs-logo.jpg' ||
        url.pathname === '/manifest.json' ||
        url.href.includes('cdn.jsdelivr.net/npm/jszip');

    if (isSpinPage) {
        event.respondWith(networkFirst(event.request));
    } else if (isAsset) {
        event.respondWith(cacheFirst(event.request));
    }
    // Other URLs: do nothing → browser default network behaviour.
});

async function networkFirst(request) {
    try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
        return fresh;
    } catch (err) {
        const hit = await caches.match(request);
        if (hit) return hit;
        throw err;
    }
}

async function cacheFirst(request) {
    const hit = await caches.match(request);
    if (hit) return hit;
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
    }
    return fresh;
}
