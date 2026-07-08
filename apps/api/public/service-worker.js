// Service worker Mozaiki — cache'uje „powłokę" aplikacji (offline + instalowalność PWA).
const CACHE = "mozaika-v8";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Zapytania do API zawsze z sieci (świeże dane); powłokę z cache (fallback do sieci).
  if (new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
