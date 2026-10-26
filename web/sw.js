// Trampou PWA Service Worker
const CACHE_NAME = 'trampou-pwa-v11';

const STATIC_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './trampou_app_icon.png',
  './trampou_onboarding_hero.png',
  './favicon.png'
];

// Instalação: Pré-cache do app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL);
    }).then(() => self.skipWaiting())
  );
});

// Ativação: Limpeza de caches antigos
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

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Ignora requisições de outros esquemas ou métodos não-GET ou painel admin (sempre rede limpa)
  if (req.method !== 'GET') return;
  if (url.pathname.includes('admin')) return;

  // 2. Chamadas de API do Supabase: Sempre Rede Primeiro (Network-First)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req);
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
          if (networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Arquivos estáticos do app (HTML, CSS, JS, Imagens locais): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
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
        .catch(() => {
          // Se offline e for navegação de página, retorna index.html em cache
          if (req.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
