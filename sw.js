// Beautia PWA Service Worker
// HTML = network-first(항상 최신 배포 반영), 정적 자산 = cache-first, 외부(수파베이스 등) = 미개입
const VER = 'beautia-v1';
const STATIC = ['/logo-mark.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(STATIC); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API·스토리지는 그대로
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    // 페이지: 네트워크 우선, 실패 시 캐시(오프라인)
    e.respondWith(fetch(e.request).then(function (r) {
      const copy = r.clone(); caches.open(VER).then(function (c) { c.put(e.request, copy); }); return r;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }
  // 정적 자산: 캐시 우선
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (r) {
      if (r.ok) { const copy = r.clone(); caches.open(VER).then(function (c) { c.put(e.request, copy); }); }
      return r;
    });
  }));
});
