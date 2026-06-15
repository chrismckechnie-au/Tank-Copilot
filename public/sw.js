const CACHE_NAME = "tank-copilot-shell-v1";
const SHELL_ASSETS = ["/offline.html", "/manifest.webmanifest", "/icon.svg"];
const EXCLUDED_NAVIGATION_PREFIXES = ["/api", "/auth", "/login", "/r", "/_next"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  const url = new URL(event.request.url);

  if (
    url.origin !== self.location.origin ||
    EXCLUDED_NAVIGATION_PREFIXES.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    ) ||
    event.request.headers.has("RSC")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/offline.html")),
  );
});
