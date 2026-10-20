// ---------------------------------------------------------------------------
// sw-template.js — the service worker: a helper script the browser runs in
// the background, separately from the page. Its job is to make RideProof
// work with no internet connection.
//
// How it works:
//   1. "install": save a copy of every app file in the browser's cache.
//   2. "activate": delete old copies from previous versions of the app.
//   3. "fetch": whenever the app asks for a file, answer from the cache
//      first (instant, works offline), and only use the network if needed.
//
// When the app is built, `npm run build` replaces the two placeholders
// below with the real list of files and a version name (see vite.config.ts).
// RideProof's data is never in here: it lives in IndexedDB on the device.
// ---------------------------------------------------------------------------
const PRECACHE_FILES = self.__PRECACHE_FILES__;
const CACHE_NAME = 'rideproof-' + self.__CACHE_VERSION__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_FILES))
      // Start using this new version right away instead of waiting.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Only handle simple "get a file" requests from our own site.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Opening the app (any page address) -> serve the saved index.html.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((cached) => cached || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

// Tapping a reminder notification opens (or switches to) the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windows) => {
      if (windows.length > 0) return windows[0].focus();
      return self.clients.openWindow('./');
    }),
  );
});
