import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  const state = { optedIn: false, id: 'anonymous' };
  const events: { name: string; id: string; timestamp?: Date }[] = [];
  return {
    state,
    events,
    init: vi.fn(),
    register: vi.fn(),
    setPersonProperties: vi.fn(),
    identify: vi.fn((id: string) => {
      state.id = id;
    }),
    reset: vi.fn(() => {
      state.id = 'anonymous';
    }),
    opt_in_capturing: vi.fn(() => {
      state.optedIn = true;
    }),
    opt_out_capturing: vi.fn(() => {
      state.optedIn = false;
    }),
    capture: vi.fn(
      (name: string, _properties: unknown, options?: { timestamp: Date }) => {
        // Match the SDK's behaviour: calls before opt-in disappear.
        if (state.optedIn) {
          events.push({ name, id: state.id, timestamp: options?.timestamp });
        }
      },
    ),
  };
});

vi.mock('posthog-js', () => ({ default: sdk }));

async function settle() {
  await vi.dynamicImportSettled();
  await Promise.resolve();
}

describe('analytics capture across the sign-in handoff', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    sdk.state.optedIn = false;
    sdk.state.id = 'anonymous';
    sdk.events.length = 0;
  });

  afterEach(() => vi.unstubAllEnvs());

  it('keeps the funnel and identity in order when auth beats consent', async () => {
    const analytics = await import('./analytics');
    analytics.initAnalytics();
    analytics.captureAnalyticsEvent('landing_auth_started');
    analytics.identifyAnalyticsUser('clerk_player');
    const authAt = new Date();
    analytics.captureAnalyticsEvent('landing_auth_completed', {
      source: 'landing',
    });
    analytics.captureAnalyticsEvent('prediction_saved', { source: 'landing' });
    analytics.captureAnalyticsEvent('landing_prediction_saved', {
      source: 'landing',
    });
    await settle();

    expect(sdk.capture).not.toHaveBeenCalled();
    expect(sdk.identify).not.toHaveBeenCalled();
    analytics.optInToAnalytics();
    await settle();

    expect(sdk.events.map(({ name, id }) => ({ name, id }))).toEqual([
      { name: 'landing_auth_started', id: 'anonymous' },
      { name: 'landing_auth_completed', id: 'clerk_player' },
      { name: 'prediction_saved', id: 'clerk_player' },
      { name: 'landing_prediction_saved', id: 'clerk_player' },
    ]);
    expect(sdk.events[1].timestamp!.getTime()).toBeGreaterThanOrEqual(
      authAt.getTime(),
    );
    expect(sdk.events[1].timestamp!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('captures an identified event even while the SDK import is in flight', async () => {
    const analytics = await import('./analytics');
    analytics.optInToAnalytics();
    analytics.identifyAnalyticsUser('clerk_player', { internal: true });
    analytics.captureAnalyticsEvent('landing_auth_completed');
    await settle();

    expect(sdk.events).toMatchObject([
      { name: 'landing_auth_completed', id: 'clerk_player' },
    ]);
    expect(sdk.identify).toHaveBeenCalledWith(
      'clerk_player',
      expect.objectContaining({ $internal_or_test_user: true }),
      expect.any(Object),
    );
  });

  it('discards queued and subsequent events when consent is denied', async () => {
    const analytics = await import('./analytics');
    analytics.captureAnalyticsEvent('landing_auth_completed');
    analytics.optOutOfAnalytics();
    analytics.identifyAnalyticsUser('clerk_player');
    analytics.captureAnalyticsEvent('landing_prediction_saved');
    await settle();

    expect(sdk.events).toEqual([]);
    expect(sdk.identify).not.toHaveBeenCalled();
    analytics.optInToAnalytics();
    analytics.captureAnalyticsEvent('prediction_saved');
    await settle();
    expect(sdk.events).toMatchObject([
      { name: 'prediction_saved', id: 'clerk_player' },
    ]);
  });

  it('honours consent withdrawal while the SDK is loading', async () => {
    const analytics = await import('./analytics');
    analytics.optInToAnalytics();
    analytics.captureAnalyticsEvent('landing_auth_completed');
    analytics.optOutOfAnalytics();
    await settle();
    expect(sdk.events).toEqual([]);
    expect(sdk.state.optedIn).toBe(false);
  });

  it('returns to anonymous attribution after sign-out', async () => {
    const analytics = await import('./analytics');
    analytics.optInToAnalytics();
    analytics.identifyAnalyticsUser('clerk_player');
    analytics.captureAnalyticsEvent('prediction_saved');
    analytics.resetAnalyticsUser();
    analytics.captureAnalyticsEvent('landing_picker_viewed');
    await settle();
    expect(sdk.events.map(({ id }) => id)).toEqual([
      'clerk_player',
      'anonymous',
    ]);
  });

  it('clears an account that signs out while consent is denied', async () => {
    const analytics = await import('./analytics');
    analytics.optInToAnalytics();
    analytics.identifyAnalyticsUser('clerk_player');
    await settle();
    analytics.optOutOfAnalytics();
    analytics.resetAnalyticsUser();
    await settle();
    analytics.optInToAnalytics();
    analytics.captureAnalyticsEvent('landing_picker_viewed');
    await settle();
    expect(sdk.events).toMatchObject([
      { name: 'landing_picker_viewed', id: 'anonymous' },
    ]);
  });

  it('does no analytics work in a development build', async () => {
    vi.stubEnv('PROD', false);
    const analytics = await import('./analytics');
    analytics.captureAnalyticsEvent('landing_auth_completed');
    analytics.identifyAnalyticsUser('clerk_player');
    analytics.optInToAnalytics();
    await settle();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.events).toEqual([]);
  });
});
