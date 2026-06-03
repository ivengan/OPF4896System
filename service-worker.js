// D:\OPF4896System\service-worker.js

const CACHE_NAME = 'opf-system-v13';
// List all files you want to work offline
const ASSETS = [
  '.',
  'index.html',
  'dashboard2.html',
  'client.html',
  'order_pending.html',
  'order.html',
  'broiler_dsptch.html',
  'parts_dsptch.html',
  'staff_management.html',
  'report.html',
  'setting.html',
  'edit_inv.html',
  'pwa-install.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'https://cdn.tailwindcss.com', 
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js',
  
  // Unified Attendance System Assets
  'attendance.html',
  'attendance_dashboard.html',
  'attendance_admin.html',
  'leave.html',
  'approve_leave.html',
  'extra_job.html',
  'approve_job.html',
  'firebase-init-attendance.js',
  'admin.js',
  'app.js',
  'extra_job.js',
  'approve_job.js',
  'leave.js',
  'i18n-init.js',
  'main.js',
  'locales/en/common.json',
  'locales/ms/common.json',
  'locales/ne/common.json',
  'locales/ta/common.json',
  'locales/zh/common.json'
];

// Install Event: Cache files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add files individually so one failure doesn't break the whole SW
      return Promise.all(
        ASSETS.map(url => {
          return fetch(url, { mode: 'no-cors' }) // Use no-cors for external CDNs like tailwind or firebase
            .then(response => {
              if (!response.ok && response.type !== 'opaque') {
                throw new Error('Network response was not ok');
              }
              return cache.put(url, response);
            })
            .catch(error => console.warn('Failed to cache asset:', url, error));
        })
      );
    })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate for robust offline mode
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // Only cache GET requests
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch latest from network to update cache in background
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Clone response before using it to store in cache
        const responseToCache = networkResponse.clone();
        
        // Cache external APIs and opaque responses safely
        if (event.request.url.startsWith('http') && 
           (networkResponse.ok || networkResponse.type === 'opaque')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.warn('Network fetch failed, serving from cache.', error);
        // We already return cachedResponse below if network fails
      });

      // Return cached immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});