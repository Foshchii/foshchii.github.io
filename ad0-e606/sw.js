/* Offline support is limited to the AD0-E606 app, not the rest of foshchii.com. */
const CACHE_NAME = "ad0-e606-practice-v1";
const APP_URL = new URL("./", self.location.href);
const APP_ROOT = APP_URL.pathname;
const ASSETS = ["./", "./index.html", "./styles.css", "./questions.js", "./app.js", "./manifest.webmanifest", "./icon.svg", "./apple-touch-icon.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("ad0-e606-practice-") && key !== CACHE_NAME).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT)) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      const cached = await caches.match(request, {ignoreSearch: true});
      if (cached) return cached;
      if (request.mode === "navigate") {
        const fallback = await caches.match(new URL("./index.html", APP_URL));
        if (fallback) return fallback;
      }
      return Response.error();
    }
  })());
});
