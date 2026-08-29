const CACHE_VERSION = 'v4';
const STATIC_CACHE = `gpp-static-${CACHE_VERSION}`;
const PAGE_CACHE = `gpp-pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Patterns that identify static, long-lived assets safe to cache-first
const STATIC_PATTERNS = [
  /^\/assets\//,
  /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|otf)(\?.*)?$/,
];
const CACHEABLE_PAGE_PATTERNS = [
  /^\/$/,
  /^\/races(?:\/|$)/,
  /^\/leaderboard(?:\/|$)/,
  /^\/pricing(?:\/|$)/,
  /^\/terms(?:\/|$)/,
  /^\/privacy(?:\/|$)/,
  /^\/refund-policy(?:\/|$)/,
  /^\/support(?:\/|$)/,
];

function isStaticAsset(url) {
  return STATIC_PATTERNS.some((p) => p.test(url.pathname));
}

function isCacheablePagePath(pathname) {
  return CACHEABLE_PAGE_PATTERNS.some((p) => p.test(pathname));
}

// Pre-cache a viewer-neutral fallback. Caching `/` here can capture the
// signed-in SSR document (including viewer-specific navigation) because an
// install request carries same-origin credentials. Previously visited public
// pages are still cached by the navigation handler below.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) =>
        cache.add(new Request(OFFLINE_URL, { cache: 'reload' })),
      ),
  );
});

// Clean up caches from previous versions
self.addEventListener('activate', (event) => {
  const currentCaches = new Set([STATIC_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gpp-') && !currentCaches.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests on our own origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    // Vite assets are content-hashed — safe to serve from cache forever
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (request.mode === 'navigate') {
    // Pages: try network first, then the exact cached page or offline screen.
    event.respondWith(networkFirstWithFallback(request, url));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Network error', { status: 408 });
  }
}

function canCacheNavigationResponse(response, url) {
  if (!response.ok) return false;
  if (!isCacheablePagePath(url.pathname)) return false;

  const cacheControl = response.headers.get('Cache-Control') || '';
  const lowerCacheControl = cacheControl.toLowerCase();
  return (
    !lowerCacheControl.includes('no-store') &&
    !lowerCacheControl.includes('private')
  );
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Grand Prix Picks', {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/notification-badge.png',
      data: { url: safeNotificationUrl(data.url) },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = safeNotificationUrl(event.notification.data?.url);
  event.waitUntil(focusOrOpenWindow(targetUrl));
});

function safeNotificationUrl(value) {
  if (typeof value !== 'string') return '/';
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

async function focusOrOpenWindow(targetUrl) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  for (const client of windowClients) {
    if ('navigate' in client) {
      await client.navigate(targetUrl);
    }
    if ('focus' in client) {
      return client.focus();
    }
  }

  return clients.openWindow(targetUrl);
}

async function networkFirstWithFallback(request, url) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (canCacheNavigationResponse(response, url)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request)) ?? (await cache.match(OFFLINE_URL));
    return (
      cached ??
      new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      })
    );
  }
}
