import { afterEach, describe, expect, it, vi } from 'vitest';

import { applySsrCacheControl } from './ssrCacheHeaders';

/** The directive `/` ships (see `homeCacheHeaders.ts`). */
const PUBLIC_DIRECTIVE =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

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
  it('lets shared caches hold a signed-out document', async () => {
    mocks.isClerkSessionPresent.mockResolvedValue(false);

    await applySsrCacheControl(PUBLIC_DIRECTIVE);

    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      PUBLIC_DIRECTIVE,
    );
  });

  // The one invariant worth a test: a signed-in document carries the viewer's
  // header nav, so a shared cache holding one would hand it to the next
  // visitor. Nothing else in this file is allowed to regress that.
  it('never marks a signed-in document publicly cacheable', async () => {
    mocks.isClerkSessionPresent.mockResolvedValue(true);

    await applySsrCacheControl(PUBLIC_DIRECTIVE);

    expect(mocks.setResponseHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(mocks.setResponseHeader).not.toHaveBeenCalledWith(
      'Cache-Control',
      PUBLIC_DIRECTIVE,
    );
  });

  it('sends no directive at all when there is no request context', async () => {
    mocks.getRequest.mockImplementation(() => {
      throw new Error('no request context');
    });

    await expect(
      applySsrCacheControl(PUBLIC_DIRECTIVE),
    ).resolves.toBeUndefined();
    expect(mocks.setResponseHeader).not.toHaveBeenCalled();
  });

  // Failing closed matters more than caching: an unreadable cookie must not
  // fall through to the public branch and publish a signed-in document.
  it('sends no directive when the cookie read fails', async () => {
    mocks.isClerkSessionPresent.mockRejectedValue(new Error('cookie read'));

    await expect(
      applySsrCacheControl(PUBLIC_DIRECTIVE),
    ).resolves.toBeUndefined();
    expect(mocks.setResponseHeader).not.toHaveBeenCalled();
  });
});
