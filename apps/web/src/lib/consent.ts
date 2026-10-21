import { capturePageView, optInToAnalytics } from './analytics';

/**
 * Decides how first-party PostHog analytics is switched on for this visitor.
 *
 * PostHog starts opted out (`opt_out_capturing_by_default`). The server says
 * whether the visitor is inside the EEA, the UK or Switzerland from
 * Cloudflare's country header (`/api/consent-region`): outside, analytics is
 * opted in with its usual cookie; inside, it runs cookieless, with no replay
 * and nothing stored on the device, which is the product decision for those
 * regions now that there is no consent prompt. Until October 2026 the prompt
 * was Google's consent manager, served inside the AdSense script; AdSense is
 * gone, and with it the up-to-four-second wait every visitor paid before
 * their first event.
 *
 * The region is one small uncached request, so the first pageview goes out
 * within a few hundred milliseconds of the analytics bundle, not seconds.
 */

const REGION_PATH = '/api/consent-region';

let started = false;

type ConsentRegion = { gdpr: boolean };

/**
 * Safe to call once per page load; no-ops on the server and on repeat calls.
 */
export function initConsentGatedAnalytics() {
  if (started || typeof window === 'undefined') {
    return;
  }
  started = true;
  void resolveRegion().then((region) => {
    if (region === null) {
      // No answer is treated as in scope: cookieless is the safe default.
      enableAnalytics({ cookieless: true });
      return;
    }
    enableAnalytics({ cookieless: region.gdpr });
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
