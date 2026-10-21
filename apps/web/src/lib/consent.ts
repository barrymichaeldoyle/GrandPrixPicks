import { useSyncExternalStore } from 'react';

import {
  capturePageView,
  optInToAnalytics,
  setAnalyticsCookieMode,
} from './analytics';

/**
 * Decides how first-party PostHog analytics is switched on for this visitor.
 *
 * PostHog starts opted out (`opt_out_capturing_by_default`). The server says
 * whether the visitor is inside the EEA, the UK or Switzerland from
 * Cloudflare's country header (`/api/consent-region`): outside, analytics is
 * opted in with its usual cookie; inside, it runs cookieless, with no replay
 * and nothing stored on the device, unless the visitor has allowed cookies
 * from the footer control (`AnalyticsCookiesButton`), a choice kept in
 * localStorage. Until October 2026 the prompt was Google's consent manager,
 * served inside the AdSense script; AdSense is gone, and with it the
 * up-to-four-second wait every visitor paid before their first event.
 *
 * The region is one small uncached request, so the first pageview goes out
 * within a few hundred milliseconds of the analytics bundle, not seconds.
 */

const REGION_PATH = '/api/consent-region';
const CHOICE_KEY = 'gpp.analytics.cookies';

type ConsentRegion = { gdpr: boolean };

/** What the footer control shows: nothing until the region is known. */
export type AnalyticsCookieChoice = {
  /** The visitor is inside the GDPR regions, so the control applies. */
  inScope: boolean;
  /** Analytics is currently keeping a cookie for this visitor. */
  cookies: boolean;
};

let started = false;
let choice: AnalyticsCookieChoice = { inScope: false, cookies: false };
const listeners = new Set<() => void>();

function publish(next: AnalyticsCookieChoice) {
  choice = next;
  for (const listener of listeners) {
    listener();
  }
}

function readStoredChoice(): boolean | null {
  try {
    const stored = window.localStorage.getItem(CHOICE_KEY);
    return stored === 'allowed' ? true : stored === 'declined' ? false : null;
  } catch {
    return null;
  }
}

function writeStoredChoice(allowed: boolean) {
  try {
    window.localStorage.setItem(CHOICE_KEY, allowed ? 'allowed' : 'declined');
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
}

/**
 * Safe to call once per page load; no-ops on the server and on repeat calls.
 */
export function initConsentGatedAnalytics() {
  if (started || typeof window === 'undefined') {
    return;
  }
  started = true;
  void resolveRegion().then((region) => {
    // No answer is treated as in scope: cookieless is the safe default.
    const inScope = region === null || region.gdpr;
    const cookies = !inScope || readStoredChoice() === true;
    publish({ inScope, cookies });
    enableAnalytics({ cookieless: !cookies });
  });
}

async function resolveRegion(): Promise<ConsentRegion | null> {
  try {
    const response = await fetch(REGION_PATH, {
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { gdpr?: unknown }).gdpr === 'boolean'
    ) {
      return { gdpr: (body as { gdpr: boolean }).gdpr };
    }
    return null;
  } catch {
    return null;
  }
}

function enableAnalytics(options: { cookieless: boolean }) {
  optInToAnalytics(options);
  // The router captures every navigation after this; the initial one happened
  // before analytics loaded, so it is sent here.
  capturePageView();
}

/** The footer control's action: allow or withdraw analytics cookies. */
export function setAnalyticsCookies(allowed: boolean) {
  if (!choice.inScope || choice.cookies === allowed) {
    return;
  }
  writeStoredChoice(allowed);
  publish({ ...choice, cookies: allowed });
  setAnalyticsCookieMode(allowed);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return choice;
}

const serverSnapshot: AnalyticsCookieChoice = {
  inScope: false,
  cookies: false,
};

function getServerSnapshot() {
  return serverSnapshot;
}

export function useAnalyticsCookieChoice(): AnalyticsCookieChoice {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
