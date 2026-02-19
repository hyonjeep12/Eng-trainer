const CACHE_NAME = 'eng-trainer-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json'
];

// Service Worker 설치
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ 캐시 저장됨');
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.log('⚠️ 캐시 저장 실패:', err);
    })
  );
});

// 요청 처리 (오프라인 지원)
self.addEventListener('fetch', event => {
  // API 요청은 항상 네트워크 우선
  if (event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 그 외 요청은 캐시 우선
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// 이전 캐시 제거
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
