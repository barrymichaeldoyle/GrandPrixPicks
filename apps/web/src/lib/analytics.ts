import type { PostHog } from 'posthog-js';

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
  eventName: string,
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

  const url = new URL(pagePath, 'https://grandprixpicks.com');
  captureAnalyticsEvent('$pageview', {
    path: `${url.pathname}${url.search}`,
    utm_source: url.searchParams.get('utm_source'),
    utm_medium: url.searchParams.get('utm_medium'),
    utm_campaign: url.searchParams.get('utm_campaign'),
  });
}

export function identifyAnalyticsUser(
  userId: string,
  properties: AnalyticsProperties,
) {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    posthog?.identify(userId, properties);
  });
}

export function resetAnalyticsUser() {
  if (!isEnabled()) {
    return;
  }

  void getPostHog().then((posthog) => {
    posthog?.reset();
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
