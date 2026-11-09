const CACHE = 'closet-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/closet-192.png', '/icons/closet-512.png', '/icons/closet-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('closet-shell-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never intercept Supabase API/storage traffic or signed URLs.
  if (
    url.origin !== self.location.origin ||
    /(^|\/)rest\/v1(\/|$)/i.test(url.pathname) ||
    /(^|\/)storage\/v1(\/|$)/i.test(url.pathname) ||
    url.searchParams.has('token') ||
    url.searchParams.has('signature')
  ) return;

  const isShellAsset = SHELL.includes(url.pathname);
  if (request.mode !== 'navigate' && !isShellAsset) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match(request)) || (await caches.match('/'));
    }
  })());
});