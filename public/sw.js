const CACHE_NAME = "pdca-web-v1";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json"];

// Instalación: cachear recursos básicos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activación: limpiar caches antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // No cachear peticiones a Firebase / APIs
  const url = event.request.url;
  if (
    url.includes("firestore.googleapis.com") ||
    url.includes("firebaseinstallations.googleapis.com") ||
    url.includes("identitytoolkit.googleapis.com") ||
    url.includes("securetoken.googleapis.com") ||
    url.includes("firebase") ||
    url.includes("googleapis.com/storage")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || new Response("Offline", { status: 503 })
        )
      )
  );
});
