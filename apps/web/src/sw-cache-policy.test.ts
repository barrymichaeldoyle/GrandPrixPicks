import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface ServiceWorkerPolicyApi {
  isCacheablePagePath: (pathname: string) => boolean;
  canCacheNavigationResponse: (
    response: {
      ok: boolean;
      headers: { get: (name: string) => string | null };
    },
    url: URL,
  ) => boolean;
  safeNotificationUrl: (value: unknown) => string;
  isFreshEnoughToServe: (response: {
    headers: { get: (name: string) => string | null };
  }) => boolean;
}

function loadServiceWorkerPolicy(): ServiceWorkerPolicyApi {
  const swPath = path.resolve(process.cwd(), 'public/sw.js');
  const swCode = readFileSync(swPath, 'utf8');
  const factory = new Function(
    'self',
    'caches',
    'Response',
    'fetch',
    'URL',
    `${swCode}
return { isCacheablePagePath, canCacheNavigationResponse, safeNotificationUrl, isFreshEnoughToServe };`,
  ) as (
    self: {
      addEventListener: (name: string, cb: EventListener) => void;
      location: { origin: string };
    },
    caches: unknown,
    ResponseCtor: typeof Response,
    fetchFn: typeof fetch,
    URLCtor: typeof URL,
  ) => ServiceWorkerPolicyApi;

  return factory(
    {
      addEventListener: () => undefined,
      location: { origin: 'https://example.com' },
    },
    {},
    Response,
    fetch,
    URL,
  );
}

describe('service worker cache policy', () => {
  it('precaches a viewer-neutral offline page instead of the SSR home page', () => {
    const swPath = path.resolve(process.cwd(), 'public/sw.js');
    const swCode = readFileSync(swPath, 'utf8');

    expect(swCode).toContain("const OFFLINE_URL = '/offline.html'");
    expect(swCode).toContain('cache.add(new Request(OFFLINE_URL');
    expect(swCode).not.toContain("cache.add('/')");
  });

  it('only marks allowlisted public routes as cacheable paths', () => {
    const { isCacheablePagePath } = loadServiceWorkerPolicy();

    expect(isCacheablePagePath('/')).toBe(true);
    expect(isCacheablePagePath('/races')).toBe(true);
    expect(isCacheablePagePath('/races/australian-gp')).toBe(true);
    expect(isCacheablePagePath('/leaderboard')).toBe(true);
    expect(isCacheablePagePath('/pricing')).toBe(true);

    expect(isCacheablePagePath('/me')).toBe(false);
    expect(isCacheablePagePath('/settings')).toBe(false);
    expect(isCacheablePagePath('/admin')).toBe(false);
  });

  it('refuses caching when response is not cache-safe', () => {
    const { canCacheNavigationResponse } = loadServiceWorkerPolicy();
    const publicUrl = new URL('https://example.com/races/australian-gp');

    expect(
      canCacheNavigationResponse(
        {
          ok: true,
          headers: { get: () => 'public, max-age=1200' },
        },
        publicUrl,
      ),
    ).toBe(true);

    expect(
      canCacheNavigationResponse(
        {
          ok: true,
          headers: { get: () => 'private, max-age=0' },
        },
        publicUrl,
      ),
    ).toBe(false);

    expect(
      canCacheNavigationResponse(
        {
          ok: true,
          headers: { get: () => 'no-store' },
        },
        publicUrl,
      ),
    ).toBe(false);

    expect(
      canCacheNavigationResponse(
        {
          ok: false,
          headers: { get: () => 'public, max-age=1200' },
        },
        publicUrl,
      ),
    ).toBe(false);

    expect(
      canCacheNavigationResponse(
        {
          ok: true,
          headers: { get: () => 'public, max-age=1200' },
        },
        new URL('https://example.com/me'),
      ),
    ).toBe(false);
  });

  it('refuses a stale page as an offline fallback', () => {
    const { isFreshEnoughToServe } = loadServiceWorkerPolicy();
    function stamped(value: string | null) {
      return { headers: { get: () => value } };
    }
    const DAY = 24 * 60 * 60 * 1000;

    expect(isFreshEnoughToServe(stamped(String(Date.now())))).toBe(true);
    expect(isFreshEnoughToServe(stamped(String(Date.now() - DAY)))).toBe(true);

    // The June-bundle case: old enough that the functions it calls may be gone.
    expect(isFreshEnoughToServe(stamped(String(Date.now() - 60 * DAY)))).toBe(
      false,
    );
    expect(isFreshEnoughToServe(stamped(String(Date.now() - 4 * DAY)))).toBe(
      false,
    );

    // Entries cached before the stamp existed carry no header at all.
    expect(isFreshEnoughToServe(stamped(null))).toBe(false);
    expect(isFreshEnoughToServe(stamped('not-a-number'))).toBe(false);
  });

  it('only accepts same-origin notification destinations', () => {
    const { safeNotificationUrl } = loadServiceWorkerPolicy();

    expect(safeNotificationUrl('/races/australia?tab=picks#top5')).toBe(
      '/races/australia?tab=picks#top5',
    );
    expect(
      safeNotificationUrl('https://example.com/notifications?id=123'),
    ).toBe('/notifications?id=123');
    expect(safeNotificationUrl('https://attacker.example/phish')).toBe('/');
    expect(safeNotificationUrl('javascript:alert(1)')).toBe('/');
    expect(safeNotificationUrl(null)).toBe('/');
  });
});
