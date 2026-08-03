import { getCalendars, getLocales } from 'expo-localization';
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

/**
 * The device's locale, in the property names shared with the web app.
 *
 * Deliberately identical keys to web's `localeProperties`: PostHog's own
 * `$browser_language` does not exist on React Native events, so without these a
 * locale breakdown would quietly mean "web only". Read from the OS rather than
 * `navigator`, which React Native does not fill in the way a browser does.
 */
function localeProperties(): AnalyticsProperties {
  const [primary] = getLocales();
  const [calendar] = getCalendars();

  return {
    locale: primary?.languageTag,
    language: primary?.languageCode ?? undefined,
    timezone: calendar?.timeZone ?? undefined,
  };
}

/** First-touch counterpart, via `$set_once`. See web for the reasoning. */
function initialLocaleProperties(): AnalyticsProperties {
  const { locale, language, timezone } = localeProperties();
  return {
    initial_locale: locale,
    initial_language: language,
    initial_timezone: timezone,
  };
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
  // On every event, so any funnel can be broken down by locale without
  // touching call sites; and on the person, so flags can target the device's
  // language from first run, before anyone signs in.
  client.register(compact(localeProperties()) ?? {});
  client.setPersonProperties(
    compact(localeProperties()),
    compact(initialLocaleProperties()),
  );
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
  client?.identify(userId, compact({ ...localeProperties(), ...properties }));
  // Unlike web, RN's `identify` takes capture options as its third argument
  // rather than a `$set_once` bag, so first-touch values are set separately.
  client?.setPersonProperties(
    compact(localeProperties()),
    compact(initialLocaleProperties()),
  );
}

export function resetAnalyticsUser() {
  client?.reset();
}
