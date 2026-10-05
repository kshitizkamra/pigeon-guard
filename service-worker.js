const CACHE_NAME = 'pigeon-guard-v17';
const MODEL_CACHE = 'pigeon-guard-models-v1';
const ASSETS_TO_CACHE = [
  './index.html', './manifest.json',
  './static/tf.min.js', './static/coco-ssd.min.js',
  './static/ai/yolox-detector.js', './static/ai/yolox-worker.js',
  './static/ai/ort.wasm.min.js', './static/ai/ort-wasm-simd-threaded.mjs',
  './static/sounds/falcon_screech.wav', './static/sounds/alarm_burst.wav',
  './static/sounds/ultrasonic_sweep.wav',
  './static/icon-192.png', './static/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // A deployment may briefly serve an older HTML response through its CDN.
    // Never label that response as the new release in the offline cache.
    const responses = await Promise.all(ASSETS_TO_CACHE.map(async asset => {
      const canonical = new URL(asset, self.registration.scope);
      const fresh = new URL(canonical);
      fresh.searchParams.set('app-release', CACHE_NAME);
      const response = await fetch(fresh.href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`App asset unavailable: ${asset}`);
      // Drain every response before waiting on the whole bundle. Otherwise
      // unconsumed bodies can occupy all browser connections during installation.
      const body = await response.clone().arrayBuffer();
      if (asset === './index.html') {
        const html = new TextDecoder().decode(body);
        const version = html.match(/const APP_VERSION = '([^']+)'/);
        if (!version || `pigeon-guard-${version[1]}` !== CACHE_NAME) {
          throw new Error('Page and offline worker releases do not match; keeping the previous app');
        }
      }
      return [canonical.href, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
    await self.skipWaiting();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'APP_VERSION', version: CACHE_NAME });
  }
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('pigeon-guard-v') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin && url.href.startsWith(self.registration.scope);
  const isModel = url.hostname === 'storage.googleapis.com' || url.hostname === 'tfhub.dev' ||
    (isLocal && /\/static\/ai\/[^/]+\.(onnx|wasm)$/.test(url.pathname));
  if (!isLocal && !isModel) return;
  event.respondWith((async () => {
    const cache = await caches.open(isModel ? MODEL_CACHE : CACHE_NAME);
    const cached = event.request.mode === 'navigate'
      ? await cache.match(new URL('index.html', self.registration.scope).href)
      : await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok || response.type === 'opaque') {
      try { await cache.put(event.request, response.clone()); }
      catch (error) { console.warn('Offline storage failed:', error); }
    }
    return response;
  })());
});
