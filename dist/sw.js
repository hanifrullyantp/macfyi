// Simple offline-first service worker for Monefyi.
// Caches app shell (HTML/CSS/JS) and falls back for navigations.
const CACHE_VERSION = "v1";
const CACHE_NAME = `monefyi-${CACHE_VERSION}`;

// Saat build Vite, beberapa asset (mis. CSS) bisa di-hash menjadi path lain.
// Jadi saat install, cukup cache `index.html` saja; sisanya di-cache "on demand"
// lewat handler `fetch` (GET same-origin).
const shellUrls = [new URL("./index.html", self.location).href];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(shellUrls))
      .catch(() => {
        // If some assets are missing, still allow SW to install.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const req = event.request;

  event.respondWith(
    (async () => {
      const url = new URL(req.url);
      const isNavigation = req.mode === "navigate" || (req.destination === "document");

      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        // Cache only same-origin GETs to avoid bloating cache.
        if (url.origin === self.location.origin && res && res.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        if (isNavigation) {
          const fallback = await caches.match(new URL("./index.html", self.location).href);
          if (fallback) return fallback;
        }
        throw e;
      }
    })()
  );
});

