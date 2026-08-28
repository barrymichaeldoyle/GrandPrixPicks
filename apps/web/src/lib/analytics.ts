import type { PostHog } from 'posthog-js';
import type { AnalyticsEventName } from '@grandprixpicks/shared/analytics';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
let initialized = false;
let posthogClient: PostHog | null = null;
let posthogPromise: Promise<PostHog | null> | null = null;

function isEnabled() {
  return import.meta.env.PROD && Boolean(posthogKey);
}

export function initAnalytics() {
  if (!isEnabled() || initialized || typeof window === 'undefined') {
    return false;
  }

  initialized = true;
  const origin = window.location.origin;
  posthogPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(posthogKey!, {
        // Ingest through our own origin by default so ad blockers and
        // corporate DNS do not silently drop a share of real traffic. See
        // server/routes/ingest. Set VITE_POSTHOG_HOST to talk to PostHog
        // directly instead.
        api_host: import.meta.env.VITE_POSTHOG_HOST ?? `${origin}/ingest`,
        // Keep "view in PostHog" links pointing at the real dashboard rather
        // than at our proxy path.
        ui_host: 'https://eu.posthog.com',
        capture_pageview: false,
        capture_pageleave: true,
        // Product analytics is intentionally event-only. This also prevents
        // DOM text and interaction metadata from entering PostHog implicitly.
        autocapture: false,
        // Replay is useful for diagnosing activation friction, but it must not
        // disclose picks, profile details, messages, or form input. Record the
        // page geometry and interactions while masking every text node/input.
        session_recording: {
          maskTextSelector: '*',
          maskAllInputs: true,
        },
        opt_out_capturing_by_default: true,
        // We don't run PostHog surveys; skip the extra surveys.js download.
        disable_surveys: true,
        // Core Web Vitals (LCP, INP, CLS) from real visitors. These are the
        // same signals Google ranks on, so measuring them here tells us what
        // field data Search Console will eventually reflect.
        capture_performance: { web_vitals: true },
        defaults: '2026-05-30',
      });
      posthogClient = posthog;
      // Every event carries the locale, so any existing funnel or trend can be
      // broken down by it without instrumenting call sites one at a time.
      posthog.register({ ...localeProperties(), platform: 'web' });
      // Person properties, set before anyone signs in: most visitors never do,
      // and flags and experiments can only target the person, so a flag that
      // decides which language the landing page speaks would otherwise be
      // untargetable for exactly the audience it is for. These survive
      // identify, which is what ties the anonymous session to the account.
      posthog.setPersonProperties(
        localeProperties(),
        initialLocaleProperties(),
      );
      return posthog;
    })
    .catch((error: unknown) => {
      console.warn('[Analytics] Failed to load PostHog.', error);
      return null;
    });
  return true;
}

function getPostHog() {
  if (!isEnabled()) {
    return Promise.resolve(null);
  }
  if (!initialized) {
    initAnalytics();
  }
  return posthogPromise ?? Promise.resolve(posthogClient);
}

export function captureAnalyticsEvent(
  eventName: AnalyticsEventName,
  properties?: AnalyticsProperties,
) {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    posthog?.capture(eventName, properties);
  });
}

export function capturePageView(path?: string) {
  const pagePath =
    path ??
    (typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.search}`);

  if (!pagePath) {
    captureAnalyticsEvent('$pageview');
    return;
  }

  captureAnalyticsEvent('$pageview', pageViewProperties(pagePath));
}

/** Stable page dimensions: query strings belong in bounded campaign fields. */
export function pageViewProperties(path: string): AnalyticsProperties {
  const url = new URL(path, 'https://grandprixpicks.com');
  return {
    path: url.pathname,
    utm_source: url.searchParams.get('utm_source'),
    utm_medium: url.searchParams.get('utm_medium'),
    utm_campaign: url.searchParams.get('utm_campaign'),
  };
}

/**
 * The device's locale, in the property names shared with the mobile app.
 *
 * PostHog tags web events with `$browser_language` automatically, but React
 * Native sends no equivalent, so a breakdown on the auto-captured property
 * silently means "web only". These names are ours and mean the same thing on
 * both platforms, which is the point: one breakdown, whole audience.
 *
 * `language` is the base tag ("en") and is the one to target. Matching on
 * `locale` means enumerating en-GB / en-ZA / en-AU to reach the same readers.
 */
export function localeProperties(): AnalyticsProperties {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const locale = navigator.language;
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Older engines can throw resolving the zone; the locale is still worth it.
  }

  return {
    locale,
    language: locale?.split('-')[0],
    timezone,
  };
}

/**
 * The same facts stamped as first-touch, via `$set_once`.
 *
 * Current locale answers "who is here now"; this answers "who did we acquire".
 * Without it a visitor who arrives on a French device and later switches their
 * phone to English is indistinguishable from one who was always English, and
 * the question a locale rollout actually asks is the first one.
 */
function initialLocaleProperties(): AnalyticsProperties {
  const { locale, language, timezone } = localeProperties();
  return {
    initial_locale: locale,
    initial_language: language,
    initial_timezone: timezone,
  };
}

export function identifyAnalyticsUser(
  userId: string,
  options?: { internal?: boolean },
) {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    posthog?.identify(
      userId,
      {
        ...localeProperties(),
        $internal_or_test_user: Boolean(options?.internal),
      },
      initialLocaleProperties(),
    );
  });
}

/**
 * A signed-in user overriding the regional defaults we guessed from the device.
 *
 * The strongest locale signal in the product: someone reaching into settings to
 * change how dates read is telling us the default was wrong for them, which is
 * the demand a translation would be serving. Kept as a person property too, so
 * "device says X, user chose Y" is a cohort rather than an event scan.
 */
export function trackRegionalPreference(settings: {
  timezone?: string | null;
  locale?: string | null;
}) {
  if (!isEnabled()) {
    return;
  }

  const device = localeProperties();
  captureAnalyticsEvent('settings_regional_updated', {
    chosen_locale: settings.locale,
    chosen_timezone: settings.timezone,
    device_locale: device.locale,
    device_timezone: device.timezone,
    overrides_device_locale:
      settings.locale != null && settings.locale !== device.locale,
  });

  void getPostHog().then((posthog) => {
    posthog?.setPersonProperties({
      preferred_locale: settings.locale ?? null,
      preferred_timezone: settings.timezone ?? null,
    });
  });
}

export function resetAnalyticsUser() {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    if (!posthog) {
      return;
    }
    posthog.reset();
    posthog.register({ ...localeProperties(), platform: 'web' });
    posthog.setPersonProperties(localeProperties(), initialLocaleProperties());
  });
}

export function optInToAnalytics() {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    posthog?.opt_in_capturing();
  });
}

export function optOutOfAnalytics() {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    posthog?.opt_out_capturing();
  });
}

export function isAnalyticsConfigured() {
  return isEnabled();
}
