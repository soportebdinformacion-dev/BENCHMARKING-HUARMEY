/**
 * Service Worker - BENCHMARKING EMPRESAS (Agrícola Huarmey)
 * Estrategia Offline-First para operación completa en campo sin cobertura móvil.
 */
const CACHE_NAME = 'huarmey-benchmarking-pwa-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './LOGO HUARMEY.png'
];

// Instalación: precachear recursos base de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

// Activación: limpiar versiones antiguas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Intercepción de peticiones:
// - Las llamadas a Google Apps Script (script.google.com) van directo a red (los datos se gestionan en IndexedDB).
// - Los recursos estáticos/UI usan Cache-First con actualización en segundo plano.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear peticiones de sincronización hacia Google Apps Script
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
