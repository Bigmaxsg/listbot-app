// ListBot service worker. Network-first so iPhones always get the latest deploy when online,
// falling back to cache offline. CACHE_VERSION is bumped by scripts/bump_version.py.
const CACHE_VERSION = "listbot-0.3.1";
const SHELL = [
  "./", "./index.html", "./boot-guard.js", "./manifest.json", "./version.js", "./states.json", "./demo/demo.json",
  "./css/tokens.css", "./css/app.css", "./css/views.css",
  "./js/app.js", "./js/ui.js", "./js/icons.js", "./js/data.js", "./js/store.js", "./js/images.js", "./js/itemnumber.js",
  "./js/views/capture.js", "./js/views/items.js", "./js/views/item.js", "./js/views/tasks.js",
  "./js/views/sold.js", "./js/views/settings.js",
  "./icons/icon-192.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    // "no-cache" = always ask the server (a cheap 304 when unchanged), never trust the browser's HTTP
    // cache. Without it, Safari served a mix of old and new modules after a deploy and the app went blank.
    (req.mode === "navigate" ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req, { cache: "no-cache" }))
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
