const CACHE = 'sakina-v2-audio';
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const root = new URL('./', self.location.href).href;
      try {
        const response = await fetch(root);
        if (response.ok) {
          const html = await response.clone().text();
          await cache.put(root, response);
          const assets = [
            ...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g),
          ]
            .map(match => new URL(match[1], root).href)
            .filter(url => new URL(url).origin === self.location.origin);
          await Promise.allSettled(assets.map(asset => cache.add(asset)));
        }
      } catch {
        /* The next successful visit can fill the cache. */
      }
      await self.skipWaiting();
    })()
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin)
    return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const root = await caches.match(
            new URL('./', self.location.href).href
          );
          if (root) return root;
        }
        return new Response(
          'الاتصال غير متاح. افتح التطبيق مرة واحدة وأنت متصل.',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        );
      })
  );
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const active = clients.find(client =>
        client.url.startsWith(self.registration.scope)
      );
      if (active) return active.focus();
      return self.clients.openWindow(self.registration.scope);
    })
  );
});
