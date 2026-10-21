/* Daridja : jeu disponible hors ligne.
 *
 * - La page : réseau d'abord (pour recevoir les mises à jour), copie gardée
 *   en cache ; sans réseau, ou si le réseau traîne plus de 4 s, la copie sert.
 * - Icônes, photos cadeaux, polices : cache d'abord, ajoutées au fil de l'eau.
 * La progression (XP, étoiles) est dans localStorage, déjà disponible hors ligne.
 * __VERSION__ est remplacé par build.py : chaque mise en ligne crée un cache neuf.
 */
const VERSION = "__VERSION__";
const CACHE = `daridja-${VERSION}`;
const CORE = ["./", "manifest.webmanifest", "icon-180.png", "icon-512.png", "photos/manifest.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("daridja-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(4000)]);
    if (response && response.ok) cache.put(cacheKey || request, response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match(cacheKey || request);
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Les polices Google arrivent en réponse « opaque » (status 0) : on les garde aussi.
  if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, "./"));
    return;
  }
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith("/photos/manifest.js")) {
      event.respondWith(networkFirst(req));
    } else {
      event.respondWith(cacheFirst(req));
    }
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(req));
  }
});
