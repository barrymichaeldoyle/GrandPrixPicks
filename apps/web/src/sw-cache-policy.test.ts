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
return { isCacheablePagePath, canCacheNavigationResponse };`,
  ) as (
    self: { addEventListener: (name: string, cb: EventListener) => void },
    caches: unknown,
    ResponseCtor: typeof Response,
    fetchFn: typeof fetch,
    URLCtor: typeof URL,
  ) => ServiceWorkerPolicyApi;

  return factory(
    { addEventListener: () => undefined },
    {},
    Response,
    fetch,
    URL,
  );
}

describe('service worker cache policy', () => {
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
});
