// Beautia PWA Service Worker
// HTML = network-first(항상 최신 배포 반영), 정적 자산 = cache-first, 외부(수파베이스 등) = 미개입
const VER = 'beautia-v12';
const STATIC = ['/logo-mark.png', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(STATIC); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); })
    .then(function () { return self.clients.matchAll({ type: 'window' }); })
    .then(function (cs) { cs.forEach(function (c) { try { c.navigate(c.url); } catch (e) {} }); })); // 새 버전 활성화 시 열린 화면 강제 새로고침(옛 캐시 자동 탈출)
});
// 웹푸시: 알림 표시 + 클릭 시 앱 열기
self.addEventListener('push', function (e) {
  var d = {}; try { d = e.data.json(); } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Beautia', {
    body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png',
    data: { url: d.url || '/community' },
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/community';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) { list[i].navigate(url); return list[i].focus(); } }
    return clients.openWindow(url);
  }));
});
self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API·스토리지는 그대로
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    // 페이지: 네트워크 우선, 실패 시 캐시(오프라인)
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(function (r) {
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
