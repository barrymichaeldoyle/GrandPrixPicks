import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analytics = vi.hoisted(() => ({
  capturePageView: vi.fn(),
  hasPersistedAnalyticsOptIn: vi.fn(() => Promise.resolve(false)),
  optInToAnalytics: vi.fn(),
  optOutOfAnalytics: vi.fn(),
}));

vi.mock('./analytics', () => analytics);

describe('consent-gated analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    window.__tcfapi = undefined;
    window.googlefc = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opts in and recovers exactly one pageview when no CMP appears', async () => {
    const { initConsentGatedAnalytics } = await import('./consent');

    initConsentGatedAnalytics();
    await vi.advanceTimersByTimeAsync(4_200);

    expect(analytics.optInToAnalytics).toHaveBeenCalledOnce();
    expect(analytics.capturePageView).toHaveBeenCalledOnce();
  });

  it('opts a returning browser in at once and still only one pageview', async () => {
    analytics.hasPersistedAnalyticsOptIn.mockResolvedValueOnce(true);
    const { initConsentGatedAnalytics } = await import('./consent');

    initConsentGatedAnalytics();
    await vi.advanceTimersByTimeAsync(0);

    expect(analytics.optInToAnalytics).toHaveBeenCalledOnce();
    expect(analytics.capturePageView).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(4_200);
    expect(analytics.capturePageView).toHaveBeenCalledOnce();
  });

  it('lets a denial from the CMP win over a persisted opt-in', async () => {
    let resolveOptIn: ((value: boolean) => void) | undefined;
    analytics.hasPersistedAnalyticsOptIn.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        resolveOptIn = resolve;
      }),
    );
    window.__tcfapi = vi.fn((command, _version, callback) => {
      if (command === 'addEventListener') {
        callback(
          {
            eventStatus: 'tcloaded',
            gdprApplies: true,
            purpose: { consents: { 1: false } },
          },
          true,
        );
      }
    });

    const { initConsentGatedAnalytics } = await import('./consent');
    initConsentGatedAnalytics();
    resolveOptIn?.(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(analytics.optOutOfAnalytics).toHaveBeenCalledOnce();
    expect(analytics.optInToAnalytics).not.toHaveBeenCalled();
    expect(analytics.capturePageView).not.toHaveBeenCalled();
  });

  it('stays opted out until storage consent is granted', async () => {
    let listener:
      | ((
          data: {
            eventStatus: 'tcloaded' | 'useractioncomplete';
            gdprApplies: boolean;
            purpose: { consents: Record<number, boolean> };
          },
          success: boolean,
        ) => void)
      | undefined;
    window.__tcfapi = vi.fn((command, _version, callback) => {
      if (command === 'addEventListener') {
        listener = callback as typeof listener;
      }
    });

    const { initConsentGatedAnalytics } = await import('./consent');
    initConsentGatedAnalytics();

    listener?.(
      {
        eventStatus: 'tcloaded',
        gdprApplies: true,
        purpose: { consents: { 1: false } },
      },
      true,
    );
    expect(analytics.optOutOfAnalytics).toHaveBeenCalledOnce();
    expect(analytics.capturePageView).not.toHaveBeenCalled();

    listener?.(
      {
        eventStatus: 'useractioncomplete',
        gdprApplies: true,
        purpose: { consents: { 1: true } },
      },
      true,
    );
    expect(analytics.optInToAnalytics).toHaveBeenCalledOnce();
    expect(analytics.capturePageView).toHaveBeenCalledOnce();
  });
});
