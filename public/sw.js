// CareTrail service worker: an offline fallback page, the offline emergency card, and dose reminders.
// Pages that show health records are never cached here; only the two offline pages and build assets are.
const CACHE = "caretrail-v1";
const OFFLINE_PAGES = ["/offline", "/offline-card"];

const isStatic = (url) => url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

/** Caches the offline pages and the scripts and styles they load, so they open with no signal. */
async function cacheOfflinePages() {
  const cache = await caches.open(CACHE);
  for (const path of OFFLINE_PAGES) {
    const res = await fetch(path, { cache: "reload", credentials: "same-origin" }).catch(() => null);
    if (!res || !res.ok || res.redirected) continue;
    await cache.put(path, res.clone());
    const html = await res.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
    await Promise.all([...new Set(assets)].map((a) => cache.add(a).catch(() => undefined)));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePages().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "refresh-offline") event.waitUntil(cacheOfflinePages());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Build assets have content hashes in their names, so a cached copy is always right.
  if (isStatic(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // The offline pages: fresh from the network when possible, the saved copy when not.
  if (OFFLINE_PAGES.includes(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) caches.open(CACHE).then((cache) => cache.put(url.pathname, res.clone()));
          return res;
        })
        .catch(() => caches.match(url.pathname)),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match("/offline")) ?? Response.error()));
  }
});

// Tapping a dose reminder opens today's medicines.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.navigate("/home#doses").then((w) => (w ?? open).focus());
      return self.clients.openWindow("/home#doses");
    }),
  );
});
