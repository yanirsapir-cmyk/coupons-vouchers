const CACHE = "coupons-cache-v6";

const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./sw.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst("./index.html"));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function networkFirst(cacheKey) {
  try {
    const fresh = await fetch(cacheKey, { cache: "no-store" });
    const cache = await caches.open(CACHE);
    cache.put(cacheKey, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const res = await fetch(req);
  const cache = await caches.open(CACHE);
  cache.put(req, res.clone());
  return res;
}
