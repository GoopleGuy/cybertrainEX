/* CyberTrain service worker — offline-first app shell. */
const CACHE_PREFIX = "cybertrain-ex:" + self.registration.scope + ":";
const VERSION = CACHE_PREFIX + "__VERSION__";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

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
