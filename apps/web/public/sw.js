const CACHE_VERSION = 'v5';
const STATIC_CACHE = `gpp-static-${CACHE_VERSION}`;
const PAGE_CACHE = `gpp-pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

/**
 * How old a cached page may be and still stand in for the network.
 *
 * The offline fallback below hands back whatever HTML we last stored for a
 * URL, and that HTML names content-hashed chunks which `STATIC_CACHE` keeps
 * cache-first forever. Nothing expired either one, so a page cached months ago
 * would still boot, and the bundle it named would still load — right up to the
 * point it called a Convex function that no longer exists. That is how a June
 * build was seen calling `races:getRaceBySlugOrLegacyRef` at the end of August:
 * one dropped fetch on a phone, and a two-month-old document came back.
 *
 * `staleChunk.ts` cannot catch this. It reloads when an import 404s, and here
 * every import resolves; the failure surfaces at the Convex boundary instead,
 * as a fatal error screen.
 *
 * Three days is the compromise. Long enough that a genuinely offline visitor
 * still gets the page they were reading, short enough that it cannot be more
 * than a few deploys behind the functions it calls.
 */
const MAX_PAGE_FALLBACK_AGE_MS = 3 * 24 * 60 * 60 * 1000;

/** Written when we store a page, read when we are deciding whether to serve it. */
const CACHED_AT_HEADER = 'x-gpp-cached-at';

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

/**
 * A copy of `response` carrying the time we stored it. Response headers are
 * immutable, so the stamp means rebuilding the response around the same body.
 * The caller keeps the original for the page and hands us a clone.
 */
async function stampedForCache(response) {
  const headers = new Headers(response.headers);
  headers.set(CACHED_AT_HEADER, String(Date.now()));
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Entries stored before this stamp existed have no header and are refused,
 * which is what we want: they are the oldest ones and the least safe to run.
 */
function isFreshEnoughToServe(response) {
  const cachedAt = Number(response.headers.get(CACHED_AT_HEADER));
  if (!Number.isFinite(cachedAt) || cachedAt <= 0) return false;
  return Date.now() - cachedAt < MAX_PAGE_FALLBACK_AGE_MS;
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
      // Not awaited, so the page is not kept waiting on the write.
      void stampedForCache(response.clone())
        .then((stamped) => cache.put(request, stamped))
        .catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached && isFreshEnoughToServe(cached)) {
      return cached;
    }
    if (cached) {
      // Too old to trust. Drop it so we stop reconsidering it every time.
      await cache.delete(request);
    }

    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ??
      new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      })
    );
  }
}
