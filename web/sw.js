'use strict';
const PREFIX = 'jack22-vision8-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + 'f3888e3127d14ce7';
const FILES = ['index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const urlFor = file => new URL(file, self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(FILES.map(urlFor)); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url), scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;
  let asset = FILES.find(file => url.pathname === new URL(urlFor(file)).pathname);
  if (request.mode === 'navigate' && url.pathname === scope.pathname) asset = 'index.html';
  if (!asset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(urlFor(asset));
    if (hit) return hit;
    return fetch(request);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'JACK22_CACHE_STATUS' || !event.ports?.[0]) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const matches = await Promise.all(FILES.map(file => cache.match(urlFor(file))));
    event.ports[0].postMessage({type: 'JACK22_CACHE_READY', ready: matches.every(Boolean)});
  })());
});
