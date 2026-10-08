// Bricklab's service worker: it makes the studio installable and lets it open offline.
// Network first: online, every file comes from the server (through the HTTP cache), so the studio is always one
// consistent version and local edits show straight away. Each response also refreshes the offline copy. Offline, files
// come from that copy. Installing a new version precaches the whole studio, so it opens offline from the first visit
// after install. VERSION follows package.json and SHELL lists every file in dist/; tests/pwa.test.js checks both.
const VERSION = '0.9.0';
const CACHE = `bricklab-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'icons/maskable-512.png',
  'icons/maskable.svg',
  'src/hud.js',
  'src/main.js',
  'src/model.js',
  'src/scene.js',
  'src/studio-ui.js',
  'src/wheel.js',
  'vendor/BufferGeometryUtils.js',
  'vendor/OrbitControls.js',
  'vendor/RoundedBoxGeometry.js',
  'vendor/THREE-LICENSE.txt',
  'vendor/three.core.js',
  'vendor/three.webgpu.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Older versions' copies go once this one is in charge.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('bricklab-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith(fromNetwork(event));
});

async function fromNetwork(event) {
  const request = event.request;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
    }
    return response;
  } catch (err) {
    // Query strings such as ?renderer=webgl pick options, not files, so they don't change which copy answers.
    const cache = await caches.open(CACHE);
    const copy = await cache.match(request, {ignoreSearch: true})
      ?? (request.mode === 'navigate' ? await cache.match('./') : undefined);
    if (copy) return copy;
    throw err;
  }
}
