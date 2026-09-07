/* Cambia VERSION al publicar cambios en HTML, CSS, menú o JS.
 * Una versión nueva espera a que se cierren todas las pestañas de la anterior.
 * Solo se almacena el menú público. Nunca peticiones al backend ni datos de cocina.
 */
const VERSION = "lasfritas-publico-v2-20260907-1";
const ARCHIVOS = ["./", "index.html", "style.css", "mejoras.css", "config.js", "utils.js", "cliente.js", "experiencia.js", "manifest.webmanifest", "assets/icon.svg", "assets/icon-192.png", "assets/icon-512.png", "offline.html"];
const PUBLICOS = new Set(ARCHIVOS.map(r => new URL(r, self.registration.scope).href));
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ARCHIVOS)));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("lasfritas-publico-") && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  url.search = ""; url.hash = "";
  if (PUBLICOS.has(url.href)) {
    event.respondWith(caches.open(VERSION).then(async cache => (await cache.match(url.href)) || fetch(event.request)));
  } else if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL("offline.html", self.registration.scope).href)));
  }
});
