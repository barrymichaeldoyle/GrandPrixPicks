import PostHog from 'posthog-react-native';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let client: PostHog | null = null;

function isEnabled() {
  return !__DEV__ && Boolean(posthogKey);
}

export function initAnalytics(): boolean {
  if (!isEnabled() || client) {
    return false;
  }
  client = new PostHog(posthogKey!, {
    host: posthogHost,
    // Screen/interaction capture stays manual, matching web's event-only setup.
    captureAppLifecycleEvents: false,
  });
  return true;
}

function compact(
  properties?: AnalyticsProperties,
): Record<string, string | number | boolean | null> | undefined {
  if (!properties) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, string | number | boolean | null] =>
        entry[1] !== undefined,
    ),
  );
}

export function captureAnalyticsEvent(
  eventName: string,
  properties?: AnalyticsProperties,
) {
  client?.capture(eventName, compact(properties));
}

export function identifyAnalyticsUser(
  userId: string,
  properties?: AnalyticsProperties,
) {
  client?.identify(userId, compact(properties));
}

export function resetAnalyticsUser() {
  client?.reset();
}
