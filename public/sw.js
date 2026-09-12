/* Actualizar VERSION y la lista de recursos juntos. Nunca activar sobre una pestaña abierta. */
const VERSION = "lasfritas-publico-procesos-20260911-1";
const FILES = [
  "./",
  "index.html",
  "config.js",
  "css/tokens.css",
  "css/cliente.css",
  "js/shared.js",
  "js/presentation.js",
  "js/cart.js",
  "js/cliente.js",
  "js/motion.js",
  "css/motion.css",
  "manifest.webmanifest",
  "offline.html",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/illustrations/fries.svg",
  "assets/illustrations/tray.svg",
  "assets/illustrations/burger.svg",
  "assets/illustrations/dog.svg",
  "assets/illustrations/plantain.svg",
  "assets/illustrations/bowl.svg",
  "assets/illustrations/drink.svg",
  "assets/illustrations/extra.svg",
];
FILES.push(
  ...[
    "salchi-quesuda",
    "salchi-madurita",
    "salchi-bacon",
    "chorifritas",
    "salchi-pollo",
    "salchi-atun",
    "salchi-nacho",
    "salchi-costi",
    "salchi-carnivora",
    "chicharrona",
    "la-power",
    "salchi-mixta",
    "trifasica",
    "mega-frita",
    "mega-frita-queso",
  ].map((id) => "assets/illustrations/" + id + ".svg"),
);
const PUBLIC = new Set(
  FILES.map((f) => new URL(f, self.registration.scope).href),
);
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("lasfritas-publico-") && k !== VERSION)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  u.search = "";
  u.hash = "";
  if (PUBLIC.has(u.href)) {
    e.respondWith(
      caches
        .open(VERSION)
        .then(async (c) => (await c.match(u.href)) || fetch(e.request)),
    );
  } else if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(new URL("offline.html", self.registration.scope).href),
      ),
    );
  }
});
