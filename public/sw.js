const CACHE = "playlist-shell-v1";
const SHELL = ["/player", "/manifest.webmanifest", "/icon.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => { if (response.ok && ["image", "video", "font", "style", "script"].includes(event.request.destination)) { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put(event.request, copy)); } return response; }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/player"))));
});
