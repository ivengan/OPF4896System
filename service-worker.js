// D:\OPF4896System\service-worker.js

const CACHE_NAME = 'opf-system-v1';
// List all files you want to work offline
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/dashboard2.html',
  '/order.html',
  '/broiler_dsptch.html',
  '/parts_dsptch.html',
  '/public/js/firebase-config.js',
  '/public/js/auth.js',
  '/public/icons/icon-192.png',
  'https://cdn.tailwindcss.com', 
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js'
];

// Install Event: Cache files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch Event: Serve from cache if offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
        return response || fetch(event.request);
    })
  );
});