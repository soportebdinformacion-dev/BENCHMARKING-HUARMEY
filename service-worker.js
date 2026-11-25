/**
 * ============================================================================
 * SERVICE WORKER - BENCHMARKING EMPRESAS (AGRÍCOLA HUARMEY)
 * Estrategia: Cache-First para recursos estáticos esenciales y Network-First
 * para llamadas dinámicas a Google Apps Script.
 * ============================================================================
 */

const CACHE_NAME = 'huarmey-benchmarking-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './LOGO HUARMEY.png'
];

// Instalación: cachear el shell de la aplicación para uso offline inmediato
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Algunos recursos opcionales no se pudieron pre-cachear:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpiar versiones antiguas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Nunca cachear peticiones POST ni llamadas hacia Google Apps Script
  if (
    event.request.method !== 'GET' ||
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.hostname.includes('script.googleusercontent.com')
  ) {
    return;
  }

  // Estrategia Cache-First con actualización en segundo plano (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red y es navegación HTML, devolver index.html cacheado
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
