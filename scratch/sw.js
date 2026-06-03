// public/sw.js
const CACHE_NAME = 'staff-attendance-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/admin.html',
  '/leave.html',
  '/approve_leave.html',
  '/extra_job.html',
  '/approve_job.html',
  '/firebase-init.js',
  '/admin.js',
  '/app.js',
  '/extra_job.js',
  '/approve_job.js',
  '/leave.js',
  '/i18n-init.js',
  '/main.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/locales/en/common.json',
  '/locales/ms/common.json',
  '/locales/ne/common.json',
  '/locales/ta/common.json',
  '/locales/zh/common.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore.googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});