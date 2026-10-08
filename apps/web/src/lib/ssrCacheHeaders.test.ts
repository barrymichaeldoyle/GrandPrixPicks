import { afterEach, describe, expect, it, vi } from 'vitest';

import { applySsrCacheControl } from './ssrCacheHeaders';

/** The tier `/` ships (see `homeCacheHeaders.ts`). */
const TIER = { edgeMaxAge: 60, staleWhileRevalidate: 300 };

const mocks = vi.hoisted(() => ({
  getRequest: vi.fn(),
  isClerkSessionPresent: vi.fn(),
  setResponseHeader: vi.fn(),
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: mocks.getRequest,
  setResponseHeader: mocks.setResponseHeader,
}));

vi.mock('../../server/lib/auth', () => ({
  isClerkSessionPresent: mocks.isClerkSessionPresent,
}));

afterEach(() => {
  vi.resetAllMocks();
});

describe('applySsrCacheControl', () => {
  it('lets Cloudflare hold a signed-out document, and browsers revalidate', async () => {
    mocks.isClerkSessionPresent.mockResolvedValue(false);

    await applySsrCacheControl(TIER);

    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=0',
    );
    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cloudflare-CDN-Cache-Control',
      'max-age=60, stale-while-revalidate=300',
    );
  });

  // Cloudflare reads s-maxage as proxy-revalidate and then refuses to serve
  // stale, which is the whole point of the stale window.
  it('never sends s-maxage', async () => {
    mocks.isClerkSessionPresent.mockResolvedValue(false);

    await applySsrCacheControl(TIER);

    for (const [, value] of mocks.setResponseHeader.mock.calls) {
      expect(String(value)).not.toContain('s-maxage');
    }
  });

  // The one invariant worth a test: a signed-in document carries the viewer's
  // header nav, so a shared cache holding one would hand it to the next
  // visitor. Nothing else in this file is allowed to regress that.
  it('never marks a signed-in document publicly cacheable', async () => {
    mocks.isClerkSessionPresent.mockResolvedValue(true);

    await applySsrCacheControl(TIER);

    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cloudflare-CDN-Cache-Control',
      'no-store',
    );
    expect(mocks.setResponseHeader).toHaveBeenCalledTimes(2);
  });

  it('sends no directive at all when there is no request context', async () => {
    mocks.getRequest.mockImplementation(() => {
      throw new Error('no request context');
    });

    await expect(applySsrCacheControl(TIER)).resolves.toBeUndefined();
    expect(mocks.setResponseHeader).not.toHaveBeenCalled();
  });

  // Failing closed matters more than caching: an unreadable cookie must not
  // fall through to the public branch and publish a signed-in document. Nor
  // may it send nothing, because the zone's cache rule stores a header-less
  // response for Cloudflare's default TTL.
  it('marks the document private when the cookie read fails', async () => {
    mocks.isClerkSessionPresent.mockRejectedValue(new Error('cookie read'));

    await applySsrCacheControl(TIER);

    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(mocks.setResponseHeader).toHaveBeenCalledTimes(2);
  });
});
