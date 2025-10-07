// service-worker.js
const CACHE_NAME = 'cipfa-pwa-v7'; // Bump this version when you make changes
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removing old cache', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET requests
  if (req.method !== 'GET') return;

  // For navigation requests (HTML), try network first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(response => {
          // Clone and cache the fresh response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline, serve cached index.html
          return caches.match('./index.html').then(cached => {
            return cached || new Response(
              '<h1>Offline - Please check your connection</h1>',
              { headers: { 'Content-Type': 'text/html' }}
            );
          });
        })
    );
    return;
  }

  // For other resources: cache first, fallback to network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      
      return fetch(req).then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone and cache the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(req, responseToCache);
        });
        
        return response;
      });
    })
  );
});

// Handle messages from the page (for notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'notify') {
    const { title, body } = event.data;
    if (self.registration.showNotification) {
      self.registration.showNotification(title, {
        body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [200, 100, 200]
      });
    }
  }
});
