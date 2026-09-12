/* CyberTrain service worker — offline-first app shell. */
const CACHE_PREFIX = "cybertrain-ex:" + self.registration.scope + ":";
const VERSION = CACHE_PREFIX + "__VERSION__";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./fonts/rajdhani-500.ttf", "./fonts/rajdhani-600.ttf", "./fonts/rajdhani-700.ttf", "./fonts/share-tech-mono.ttf"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  // Refresh the app on launch, retaining the cached shell for offline use.
  if (e.request.mode === "navigate" || /\/(app\.js|index\.html|manifest\.webmanifest)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(e.request, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Shell unavailable");
        await cache.put(e.request, response.clone());
        return response;
      } catch {
        return await cache.match(e.request, { ignoreSearch: true }) ||
          (e.request.mode === "navigate" ? await cache.match("./index.html") : null) || Response.error();
      } finally { clearTimeout(timeout); }
    })());
    return;
  }
  e.respondWith(
    caches.open(VERSION).then(cache => cache.match(e.request, { ignoreSearch: true })).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const url = e.request.url;
        if (res.ok && (url.startsWith(self.location.origin) || url.includes("fonts.g"))) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => e.request.mode === "navigate" ? caches.open(VERSION).then(cache => cache.match("./index.html")) : Response.error());
    })
  );
});
