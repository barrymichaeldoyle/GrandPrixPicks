import posthog from 'posthog-js';

type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
let initialized = false;

function isEnabled() {
  return import.meta.env.PROD && Boolean(posthogKey);
}

export function initAnalytics() {
  if (!isEnabled() || initialized) {
    return false;
  }

  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    opt_out_capturing_by_default: true,
  });
  initialized = true;
  return true;
}

export function captureAnalyticsEvent(
  eventName: string,
  properties?: AnalyticsProperties,
) {
  if (!isEnabled()) {
    return;
  }

  posthog.capture(eventName, properties);
}

export function capturePageView(path?: string) {
  captureAnalyticsEvent('$pageview', path ? { path } : undefined);
}

export function identifyAnalyticsUser(
  userId: string,
  properties: AnalyticsProperties,
) {
  if (!isEnabled()) {
    return;
  }

  posthog.identify(userId, properties);
}

export function resetAnalyticsUser() {
  if (!isEnabled()) {
    return;
  }

  posthog.reset();
}

export function hasOptedInToAnalytics() {
  return isEnabled() && posthog.has_opted_in_capturing();
}

export function optInToAnalytics() {
  if (!isEnabled()) {
    return;
  }

  posthog.opt_in_capturing();
}

export function optOutOfAnalytics() {
  if (!isEnabled()) {
    return;
  }

  posthog.opt_out_capturing();
}

export function isAnalyticsConfigured() {
  return isEnabled();
}
