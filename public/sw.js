/**
 * Service Worker — MyLevain Agro PWA
 * Cache essential pages and reference data on install.
 * Serve from cache when offline (network-first strategy).
 * Exigences: 10.1, 10.2, 10.3
 */

const CACHE_NAME = "mylevain-v1";

// Essential pages to cache on install
const PRECACHE_URLS = [
  "/",
  "/observations/new",
  "/observations/batch",
  "/traitements/new",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// ---- Install: pre-cache essential pages ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ---- Activate: clean old caches ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---- Fetch: network-first, fallback to cache ----
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip non-http(s) requests and Supabase API calls
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Fallback: for navigation requests, serve the cached root page
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      }),
  );
});
