// PWA MANIFEST INJECTION
// ═══════════════════════════════════════════
function injectPWAManifest() {
  var manifest = {
    name: 'ريحانة كافيه',
    short_name: 'ريحانة',
    description: 'نظام إدارة ريحانة كافيه',
    start_url: window.location.href,
    display: 'standalone',
    background_color: '#EDEAD8',
    theme_color: '#0F2D18',
    orientation: 'portrait',
    icons: [{
      src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%230F2D18"/><text y=".88em" font-size="72" x="14">🌿</text></svg>',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any maskable'
    }]
  };
  var blob = new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'});
  var url = URL.createObjectURL(blob);
  var link = document.getElementById('pwaManifest');
  if(link) link.href = url;
}

// ═══════════════════════════════════════════
// V24-3 PRO: SERVICE WORKER للعمل بدون إنترنت
// ═══════════════════════════════════════════
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // إنشاء Service Worker inline
    var swCode = `
      const CACHE_NAME = 'rayhana-v25-3';
      const urlsToCache = [self.location.href];

      self.addEventListener('install', function(event) {
        event.waitUntil(
          caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
          })
        );
        self.skipWaiting();
      });

      self.addEventListener('fetch', function(event) {
        // Network-first: always try to get fresh content, fall back to cache offline
        event.respondWith(
          fetch(event.request).then(function(response) {
            if (!response || response.status !== 200) {
              return caches.match(event.request).then(function(cached) {
                return cached || response;
              });
            }
            var responseToCache = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
            return response;
          }).catch(function() {
            return caches.match(event.request);
          })
        );
      });

      self.addEventListener('activate', function(event) {
        event.waitUntil(
          caches.keys().then(function(cacheNames) {
            return Promise.all(
              cacheNames.filter(function(name) {
                return name !== CACHE_NAME;
              }).map(function(name) {
                return caches.delete(name);
              })
            );
          })
        );
        self.clients.claim();
      });
    `;
    
    var swBlob = new Blob([swCode], {type: 'application/javascript'});
    var swUrl = URL.createObjectURL(swBlob);
    
    navigator.serviceWorker.register(swUrl, {scope: '/'})
      .then(function(registration) {
        debugLog('✅ Service Worker registered');
      })
      .catch(function(error) {
        // في بعض البيئات قد لا يعمل - هذا طبيعي
        debugLog('⚠️ Service Worker registration failed:', error);
      });
  }
}

// تسجيل Service Worker عند التحميل
setTimeout(registerServiceWorker, 3000);

// ═══════════════════════════════════════════
