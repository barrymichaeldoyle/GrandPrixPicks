import { beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
  setPersonProperties: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
}));

vi.mock('posthog-react-native', () => ({
  default: class PostHogMock {
    capture = posthog.capture;
    identify = posthog.identify;
    register = posthog.register;
    reset = posthog.reset;
    setPersonProperties = posthog.setPersonProperties;
    optIn = posthog.optIn;
    optOut = posthog.optOut;
  },
}));

vi.mock('./storage', () => ({
  getStoredJson: vi.fn(),
  setStoredJson: vi.fn(),
}));

vi.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-ZA', languageCode: 'en' }],
  getCalendars: () => [{ timeZone: 'Africa/Johannesburg' }],
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

describe('mobile analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubGlobal('__DEV__', false);
  });

  it('initializes on first capture and stamps the real native platform', async () => {
    const { captureAnalyticsEvent, setAnalyticsConsent } =
      await import('./analytics');
    await setAnalyticsConsent(true);

    captureAnalyticsEvent('screen_viewed', { screen: 'Home' });

    expect(posthog.register).toHaveBeenCalledWith({
      locale: 'en-ZA',
      language: 'en',
      timezone: 'Africa/Johannesburg',
      platform: 'ios',
    });
    expect(posthog.capture).toHaveBeenCalledWith('screen_viewed', {
      screen: 'Home',
    });
  });

  it('tags an internal person without sending their email address', async () => {
    const { identifyAnalyticsUser, setAnalyticsConsent } =
      await import('./analytics');
    await setAnalyticsConsent(true);

    identifyAnalyticsUser('clerk_user_1', { internal: true });

    expect(posthog.identify).toHaveBeenCalledWith('clerk_user_1', {
      locale: 'en-ZA',
      language: 'en',
      timezone: 'Africa/Johannesburg',
    });
    expect(posthog.setPersonProperties).toHaveBeenLastCalledWith(
      expect.objectContaining({ $internal_or_test_user: true }),
      expect.not.objectContaining({ email: expect.anything() }),
    );
  });

  it('drops events until explicit consent is granted', async () => {
    const { captureAnalyticsEvent } = await import('./analytics');

    captureAnalyticsEvent('screen_viewed', { screen: 'Home' });

    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
