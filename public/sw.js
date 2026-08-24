const CACHE_NAME = 'family-link-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.jpg',
  './favicon.svg'
];

// Install: Precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW Precache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Offline-first with dynamic caching & graceful fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests and chrome-extension / non-http requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // Bypass Google Auth / Firestore live webchannels so real-time sync works
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  // 1. Navigation requests (HTML document) -> Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html').then((cached) => {
            return cached || caches.match('/index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images, fonts) -> Cache first, fallback to network & dynamically cache
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background if network is available
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache: fetch from network and store in cache
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an image, fallback to icon.jpg if possible
          if (request.destination === 'image') {
            return caches.match('./icon.jpg');
          }
          // Do not reject promise to avoid Safari iOS blank screen
          return new Response('Offline resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});
