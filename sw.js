// ============================================
// Service Worker für PWA-Offline-Unterstützung
// Cache-Version wird bei jedem Deploy erhöht
// ============================================

const CACHE_VERSION = 2;
const CACHE_NAME = `survival-island-v${CACHE_VERSION}`;

// Bei Installation: Nur Basis-Ressourcen cachen, sofort aktivieren
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
      ]);
    })
  );
  // Sofort aktivieren (nicht auf alte Tabs warten)
  self.skipWaiting();
});

// Bei Aktivierung: ALLE alten Caches löschen
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
  // Sofort alle offenen Tabs übernehmen
  self.clients.claim();
});

// Netzwerk-Anfragen: Network-first für alles
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Nur GET-Requests cachen
  if (request.method !== 'GET') return;

  // Supabase/API-Anfragen NICHT cachen
  if (request.url.includes('supabase') || request.url.includes('/rest/') || request.url.includes('/realtime/')) {
    return;
  }

  // Navigation-Requests (HTML-Seiten): Immer Netzwerk, Fallback auf Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Statische Assets (JS, CSS, Bilder): Network-first, Cache als Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Nur gültige Antworten cachen
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: Aus Cache laden
        return caches.match(request);
      })
  );
});

// Nachricht vom Client: Cache leeren und neu laden
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
