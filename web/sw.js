// Trampou PWA Service Worker
const CACHE_NAME = 'trampou-pwa-v32';

const STATIC_SHELL = [
  './',
  './index.html',
  './styles.css',
  './styles.css?v=32',
  './app.js',
  './app.js?v=32',
  './manifest.json',
  './manifest.json?v=5',
  './icon-192.png',
  './icon-192.png?v=5',
  './icon-512.png',
  './icon-512.png?v=5',
  './icon-maskable-512.png',
  './icon-maskable-512.png?v=5',
  './trampou_app_icon.png',
  './trampou_app_icon.png?v=5',
  './trampou_onboarding_hero.png',
  './banner-share-trampou.webp',
  './banner-share-trampou.png',
  './banner-home-2.webp',
  './banner-home-2.jpg',
  './favicon.png'
];

// InstalaÃ§Ã£o: PrÃ©-cache do app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// AtivaÃ§Ã£o: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// InterceptaÃ§Ã£o de requisiÃ§Ãµes
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Ignora requisiÃ§Ãµes de outros esquemas ou mÃ©todos nÃ£o-GET
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // 2. Chamadas de API do Supabase, ViaCEP e IBGE: Sempre Rede Primeiro (Network-First) com cache de leitura e fallback seguro
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('viacep.com.br') ||
      url.hostname.includes('ibge.gov.br')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify([]), {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // 3. Fontes externas (Google Fonts, FontAwesome): Stale-While-Revalidate
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        }).catch(() => cached || new Response('', { status: 504 }));
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Arquivos HTML, CSS e JS do app: Network-First para sempre refletir atualizaÃ§Ãµes imediatamente
  if (req.mode === 'navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req).then((exactCached) => {
            if (exactCached) return exactCached;
            return caches.match(req, { ignoreSearch: true }).then((fallback) => {
              if (fallback) return fallback;
              if (req.mode === 'navigate') {
                return caches.match('./index.html') || caches.match('./');
              }
              return new Response('', { status: 504 });
            });
          });
        })
    );
    return;
  }

  // 5. Demais ativos estÃ¡ticos (Imagens, Ã­cones): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((exactCached) => {
      return (exactCached ? Promise.resolve(exactCached) : caches.match(req, { ignoreSearch: true })).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || new Response('', { status: 504 }));

        return cachedResponse || fetchPromise;
      });
    })
  );
});
