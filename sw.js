/**
 * sw.js — Service Worker لريحانة كافيه
 * Strategy: Network-first مع fallback إلى cache
 * يتيح العمل أوفلاين بعد أول زيارة
 */

const CACHE = 'rayhanacafe-v26';
const CORE_FILES = ['./index.html', './manifest.json', './icon.svg'];

// تثبيت: تخزين الملفات الأساسية
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(CORE_FILES);
    }).catch(function(e) {
      console.warn('[SW] install cache failed:', e);
    })
  );
});

// تفعيل: حذف cache القديم
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: شبكة أولاً، cache ثانياً
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  // تجاهل طلبات API الخارجية (Supabase, Groq, Anthropic)
  var url = event.request.url;
  if (url.includes('supabase.co') || url.includes('api.groq.com') || url.includes('anthropic.com')) return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) { cache.put(event.request, clone); });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || new Response(
          '<h2 style="font-family:sans-serif;text-align:center;padding:40px">📡 لا يوجد اتصال بالإنترنت<br><small>البيانات محفوظة محلياً — ستُزامن عند عودة الاتصال</small></h2>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      });
    })
  );
});
