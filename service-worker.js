const CACHE_NAME = 'pigeon-guard-v11';
const ASSETS_TO_CACHE = [
  './static/tf.min.js',
  './static/coco-ssd.min.js',
  './static/sounds/falcon_screech.wav',
  './static/sounds/alarm_burst.wav',
  './static/sounds/ultrasonic_sweep.wav',
  './static/icon-192.png',
  './static/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker v7] Caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. NETWORK-FIRST for HTML / page navigations (Ensures code updates load immediately!)
  if (event.request.mode === 'navigate' || url.endsWith('/') || url.includes('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('./index.html');
        })
    );
    return;
  }

  // 2. CACHE-FIRST for heavy static JS & audio files
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
