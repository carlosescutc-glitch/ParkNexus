/**
 * ==============================================================================
 * SERVICE WORKER - PRECISION PARK (PWA)
 * - Qué hace: Intercepta peticiones del navegador para habilitar el soporte offline.
 *   Cachea recursos estáticos (HTML, CSS, JS, Iconos) y maneja estrategias de
 *   red/caché para la PWA de Precision Park.
 * ==============================================================================
 */

const CACHE_NAME = 'precision-park-cache-v1';

// Recursos estáticos esenciales que se guardan en la caché al instalar la app
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. EVENTO 'INSTALL': Se ejecuta cuando el navegador detecta por primera vez el Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando y cacheando recursos estáticos...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Añadir todos los recursos esenciales a la caché
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Obliga al Service Worker activo a tomar el control inmediatamente
        return self.skipWaiting();
      })
  );
});

// 2. EVENTO 'ACTIVATE': Se ejecuta cuando el SW toma el control de la página
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando y limpiando cachés antiguas...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Si hay cachés de versiones anteriores, eliminarlas
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Reclamar el control de los clientes abiertos de forma inmediata
      return self.clients.claim();
    })
  );
});

// 3. EVENTO 'FETCH': Intercepta las solicitudes de red para buscar en la caché primero
self.addEventListener('fetch', (event) => {
  // Ignorar solicitudes POST que no se pueden cachear
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Retornar el recurso cacheado si existe
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no está en caché, realizar la petición HTTP regular a la red
        return fetch(event.request).then((networkResponse) => {
          // Si la respuesta es inválida o externa sin cabeceras adecuadas, no la cacheamos
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clonar la respuesta de la red para guardarla en caché dinámicamente
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((err) => {
          console.log('[Service Worker] Error al buscar recurso en la red (offline):', err);
          // Si falla y la petición es de navegación, retornar el index '/'
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});
