import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  capturePageView: vi.fn(),
  optInToAnalytics: vi.fn(),
}));

vi.mock('./analytics', () => analytics);

function regionResponse(body: unknown, ok = true) {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(body),
    } as Response),
  );
}

describe('region-gated analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opts a visitor outside the GDPR regions in with cookies, once', async () => {
    const fetchMock = regionResponse({ gdpr: false });
    vi.stubGlobal('fetch', fetchMock);
    const { initConsentGatedAnalytics } = await import('./consent');

    initConsentGatedAnalytics();
    initConsentGatedAnalytics();
    await vi.waitFor(() =>
      expect(analytics.optInToAnalytics).toHaveBeenCalled(),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/consent-region',
      expect.objectContaining({ credentials: 'omit' }),
    );
    expect(analytics.optInToAnalytics).toHaveBeenCalledExactlyOnceWith({
      cookieless: false,
    });
    expect(analytics.capturePageView).toHaveBeenCalledOnce();
  });

  it('runs cookieless inside the GDPR regions', async () => {
    vi.stubGlobal('fetch', regionResponse({ gdpr: true }));
    const { initConsentGatedAnalytics } = await import('./consent');

    initConsentGatedAnalytics();
    await vi.waitFor(() =>
      expect(analytics.optInToAnalytics).toHaveBeenCalled(),
    );

    expect(analytics.optInToAnalytics).toHaveBeenCalledExactlyOnceWith({
      cookieless: true,
    });
    expect(analytics.capturePageView).toHaveBeenCalledOnce();
  });

  it.each([
    ['a failed request', regionResponse({ gdpr: false }, false)],
    ['a malformed body', regionResponse({ region: 'ZA' })],
    ['a network error', vi.fn(() => Promise.reject(new Error('offline')))],
  ])('falls back to cookieless on %s', async (_label, fetchMock) => {
    vi.stubGlobal('fetch', fetchMock);
    const { initConsentGatedAnalytics } = await import('./consent');

    initConsentGatedAnalytics();
    await vi.waitFor(() =>
      expect(analytics.optInToAnalytics).toHaveBeenCalled(),
    );

    expect(analytics.optInToAnalytics).toHaveBeenCalledExactlyOnceWith({
      cookieless: true,
    });
    expect(analytics.capturePageView).toHaveBeenCalledOnce();
  });
});
