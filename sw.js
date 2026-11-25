// Offline support. Pages load from the network first (so updates arrive right away)
// and fall back to the cached copy when the gym has no signal.
const CACHE = "liftlog-v13";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  // Only the app itself and its fonts are cached; sync calls to GitHub always go to the network.
  if (u.origin !== self.location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  const isPage = e.request.mode === "navigate";
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((r) => {
        if (r && (r.ok || r.type === "opaque")) c.put(e.request, r.clone());
        return r;
      });
      if (isPage) return net.catch(() => hit || c.match("index.html"));
      return hit ? (net.catch(() => {}), hit) : net.catch(() => hit);
    })
  );
});
