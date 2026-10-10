// Drop the old next-pwa `apis` cache and remove `/api` entries from mixed caches.
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await caches.delete("apis");

    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const { pathname } = new URL(request.url);
        if (pathname === "/api" || pathname.startsWith("/api/")) {
          await cache.delete(request);
        }
      }
    }
  })());
});
