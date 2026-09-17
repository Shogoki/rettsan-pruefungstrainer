/* Service Worker – macht die App offline nutzbar.
   App-Dateien werden bei der Installation gecacht; die Zusammenfassungen
   (PDF, zusammen ca. 10 MB) erst, wenn sie tatsächlich geöffnet wurden. */

const VERSION = "v2";
const SHELL = "rettsan-shell-" + VERSION;
const DOCS = "rettsan-docs";          /* überlebt App-Updates */
const FONTS = "rettsan-fonts";

const ASSETS = [
  ".",
  "index.html",
  "css/app.css",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-180.png",
  "icons/icon-maskable.png",
  "js/data/docs.js",
  "js/data/open.js",
  "js/data/cases.js",
  "js/data/mc.js",
  "js/catalog.js",
  "js/store.js",
  "js/ui.js",
  "js/exam.js",
  "js/view-setup.js",
  "js/view-exam.js",
  "js/view-results.js",
  "js/view-learn.js",
  "js/view-browse.js",
  "js/view-stats.js",
  "js/app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("rettsan-shell-") && k !== SHELL)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
  return res;
}

/* Netz zuerst, damit Änderungen am Fragenkatalog sofort ankommen;
   ohne Netz greift der Cache. */
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req) || await cache.match("index.html");
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin && url.pathname.endsWith(".pdf")) {
    e.respondWith(cacheFirst(req, DOCS));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(cacheFirst(req, FONTS));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(networkFirst(req, SHELL));
  }
});
