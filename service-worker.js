// service-worker.js
const CACHE_NAME = 'cipfa-pwa-v6'; // bump this when you ship changes
const ASSETS = [
  './index.html',           // offline fallback
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache essentials
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting(); // activate immediately
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch:
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) Always try NETWORK FIRST for navigations (HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // no-store ensures we don't read any intermediary caches
        return await fetch(req, { cache: 'no-store' });
      } catch (e) {
        // offline fallback to cached index.html
        const cached = await caches.match('./index.html');
        return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' }});
      }
    })());
    return;
  }

  // 2) For other GETs: Cache, then network (and cache the result)
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        return cached; // may be undefined; okay
      }
    })());
  }
});
