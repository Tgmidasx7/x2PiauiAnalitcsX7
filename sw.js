/* Service Worker Offline-First para x2PiauiAnalitcsX7 */
const CACHE_NAME = 'piaui-ultron-x7-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './404.html',
  './manifest.webmanifest',
  './eyeofgod/index.html',
  './ultron/index.html',
  './assets/icon.svg',
  './assets/enhancements.css',
  './assets/eye-of-god.css',
  './assets/ultron.css',
  './assets/vendor/chart.umd.js',
  './assets/news.js',
  './assets/cameras.js',
  './assets/territories.js',
  './assets/dashboard.js',
  './assets/eye-of-god.js',
  './assets/ultron.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
