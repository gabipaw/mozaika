// Service worker Mozaiki — cache'uje „powłokę" aplikacji (offline + instalowalność PWA).
const CACHE = "mozaika-v208";
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
  if (request.method !== "GET") return;
  // Zapytania do API zawsze z sieci (świeże dane) — bez cache.
  if (new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }
  // Powłoka: najpierw sieć (świeży front gdy online), cache tylko jako fallback offline.
  // cache: "no-store" — OMIJAMY HTTP-cache przeglądarki. Bez tego fetch() potrafił
  // oddać starą wersję app.js/styles.css/index.html z dysku i front zostawał na
  // starym mimo deployu (mieszanka nowych i starych plików).
  event.respondWith(
    fetch(request, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request)),
  );
});

// --- Web Push: powiadomienia na telefon (działają, gdy apka jest zamknięta) ---

self.addEventListener("push", (event) => {
  // Ładunek powinien być JSON-em z serwera, ale bramka może dostarczyć też pusty
  // push — wtedy pokazujemy komunikat ogólny zamiast wywalać się na parsowaniu.
  let dane = { title: "Mozaika", body: "Masz nowe powiadomienie.", url: "/" };
  try {
    if (event.data) dane = { ...dane, ...event.data.json() };
  } catch {
    if (event.data) dane.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(dane.title, {
      body: dane.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: dane.url || "/" },
      // Ten sam tag → nowe powiadomienie ZASTĘPUJE stare, zamiast zasypywać ekran.
      // Rozmowy przysyłają własny tag (per nadawca), bo inaczej wiadomość od jednej
      // osoby kasowałaby z ekranu tę od drugiej.
      tag: dane.tag || "mozaika",
    }),
  );
});

// Klik w powiadomienie: podnieś już otwartą kartę Mozaiki, a jak żadnej nie ma — otwórz.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cel = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((klienci) => {
        for (const k of klienci) {
          if ("focus" in k) {
            // Samo focus() zostawiało usera tam, gdzie był — czyli klik w powiadomienie
            // o wiadomości nie otwierał rozmowy. Otwartej karcie nie przeładowujemy
            // (zgubiłaby stan), tylko mówimy jej, dokąd ma przejść.
            k.postMessage({ type: "navigate", url: cel });
            return k.focus();
          }
        }
        return self.clients.openWindow(cel);
      }),
  );
});
