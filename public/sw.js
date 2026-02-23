// ============================================
// Service Worker für PWA-Offline-Unterstützung
// Cache-Version wird bei jedem Deploy erhöht
// ============================================

const CACHE_VERSION = 6;
const CACHE_NAME = `survival-island-v${CACHE_VERSION}`;

// Bei Installation: Nur Manifest cachen (NICHT index.html — die soll immer frisch sein)
self.addEventListener('install', (event) => {
  console.log('[SW] Install v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './manifest.json',
      ]);
    })
  );
  // Sofort aktivieren (nicht auf alte Tabs warten)
  self.skipWaiting();
});

// Bei Aktivierung: ALLE alten Caches löschen + alle Clients übernehmen
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Lösche alten Cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Sofort alle offenen Tabs/Fenster übernehmen
      return self.clients.claim();
    }).then(() => {
      // Alle Clients informieren dass neuer SW aktiv ist
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
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

  // Navigation-Requests (HTML-Seiten): IMMER vom Netzwerk laden, nie cachen
  // Das ist kritisch für PWA-Updates — die index.html muss immer frisch sein!
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // sw.js selbst NIEMALS cachen (Browser-Standard, aber sicherheitshalber)
  if (request.url.includes('sw.js')) {
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

// Nachricht vom Client: skipWaiting oder Cache komplett leeren
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)));
    }).then(() => {
      console.log('[SW] Alle Caches gelöscht');
    });
  }
});
