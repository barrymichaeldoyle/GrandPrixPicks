import {
  capturePageView,
  optInToAnalytics,
  optOutOfAnalytics,
} from './analytics';

/**
 * Consent bridge between Google's certified CMP (required for AdSense in the
 * EEA/UK/CH) and our first-party PostHog analytics opt-in.
 *
 * Google's CMP is the single consent surface. For visitors in scope of GDPR it
 * shows the IAB TCF consent message and exposes `window.__tcfapi`; we read that
 * signal and mirror it onto PostHog. Visitors outside that scope never see the
 * CMP, so we opt them into anonymous analytics by default (see product decision
 * in the AdSense consolidation). PostHog itself starts opted out
 * (`opt_out_capturing_by_default`), so the safe default is "no capture" until
 * one of these branches explicitly opts in.
 */

// Minimal shape of the IAB TCF v2.2 payload we consume.
interface TcData {
  eventStatus?: 'tcloaded' | 'cmpuishown' | 'useractioncomplete';
  gdprApplies?: boolean;
  purpose?: { consents?: Record<number, boolean | undefined> };
}

type TcfApi = (
  command: 'addEventListener' | 'removeEventListener' | 'getTCData',
  version: number,
  callback: (data: TcData, success: boolean) => void,
) => void;

interface GoogleFundingChoices {
  showRevocationMessage?: () => void;
}

declare global {
  interface Window {
    __tcfapi?: TcfApi;
    googlefc?: GoogleFundingChoices;
  }
}

// TCF Purpose 1: "Store and/or access information on a device." We treat consent
// for it as the gate for setting first-party analytics cookies.
const STORAGE_PURPOSE = 1;
// How long to wait for the CMP to inject the TCF API before assuming the visitor
// is out of scope (non-EEA) and defaulting analytics on.
const TCF_WAIT_MS = 4000;
const TCF_POLL_MS = 200;

let started = false;
let initialPageViewRecovered = false;

/**
 * Wire PostHog opt-in to the CMP's consent state. Safe to call once per page
 * load; no-ops on the server and on repeat calls.
 */
export function initConsentGatedAnalytics() {
  if (started || typeof window === 'undefined') {
    return;
  }
  started = true;
  waitForTcf(0);
}

function waitForTcf(elapsed: number) {
  if (typeof window.__tcfapi === 'function') {
    subscribeToTcf(window.__tcfapi);
    return;
  }
  if (elapsed >= TCF_WAIT_MS) {
    // No CMP after waiting — treat as out of GDPR scope and opt in by default.
    enableAnalytics();
    return;
  }
  window.setTimeout(() => waitForTcf(elapsed + TCF_POLL_MS), TCF_POLL_MS);
}

function subscribeToTcf(tcfApi: TcfApi) {
  tcfApi('addEventListener', 2, (data, success) => {
    if (!success || !data) {
      return;
    }
    if (
      data.eventStatus !== 'tcloaded' &&
      data.eventStatus !== 'useractioncomplete'
    ) {
      // 'cmpuishown' — the message is up and the user hasn't chosen yet. Stay
      // opted out until they act.
      return;
    }
    if (data.gdprApplies === false) {
      // Outside the EEA/UK/CH — opt in to anonymous analytics by default.
      enableAnalytics();
      return;
    }
    if (data.purpose?.consents?.[STORAGE_PURPOSE] === true) {
      enableAnalytics();
    } else {
      optOutOfAnalytics();
    }
  });
}

function enableAnalytics() {
  optInToAnalytics();
  // Recover the first pageview that was dropped while consent was pending. The
  // router captures every navigation after this, so only the initial one needs
  // recovering, and only once.
  if (!initialPageViewRecovered) {
    initialPageViewRecovered = true;
    capturePageView();
  }
}

/**
 * Whether Google's CMP is present and able to re-show its consent message. True
 * only for visitors the CMP served (i.e. in GDPR scope), so a "Privacy choices"
 * control can hide itself for everyone else instead of being a dead button.
 */
export function canManageConsent(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.googlefc?.showRevocationMessage === 'function'
  );
}

/** Re-open Google's CMP so the visitor can change their consent choices. */
export function openConsentManager(): void {
  window.googlefc?.showRevocationMessage?.();
}
