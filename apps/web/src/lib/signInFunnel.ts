import { captureAnalyticsEvent } from './analytics';

/**
 * What happens between "Sign in to save" and a signed-in player, which nothing
 * recorded: of 21 landing visitors who finished a Top 5 in the month to
 * 2026-11-18, 4 pressed sign-in and every one left 5 to 10 seconds later, with
 * no way to tell whether the modal was slow to appear or was seen and closed.
 *
 * Three events answer that: how long the modal took to appear after the
 * request (`signin_modal_opened`, `wait_ms`), that it never appeared
 * (`signin_modal_timeout`), and how it ended (`signin_modal_closed`, with
 * `open_ms` and whether the visitor came out signed in).
 */

let requestedAt: number | null = null;

/** Called where sign-in is requested, before Clerk has necessarily loaded. */
export function markSignInRequested() {
  requestedAt = Date.now();
}

function waitMs() {
  return requestedAt === null ? null : Date.now() - requestedAt;
}

export function reportSignInTimeout() {
  captureAnalyticsEvent('signin_modal_timeout', {
    wait_ms: waitMs(),
    path: window.location.pathname,
  });
  requestedAt = null;
}

/**
 * Reports the modal appearing, then watches for it to go. The watcher lives
 * outside React on purpose: the component that opened the modal can unmount
 * before the visitor closes it.
 */
export function reportSignInOpened(isSignedIn: () => boolean) {
  const openedAt = Date.now();
  captureAnalyticsEvent('signin_modal_opened', {
    wait_ms: waitMs(),
    path: window.location.pathname,
  });
  requestedAt = null;

  const watcher = new MutationObserver(() => {
    if (document.querySelector('.cl-modalBackdrop')) {
      return;
    }
    watcher.disconnect();
    captureAnalyticsEvent('signin_modal_closed', {
      open_ms: Date.now() - openedAt,
      signed_in: isSignedIn(),
      path: window.location.pathname,
    });
  });
  watcher.observe(document.body, { childList: true, subtree: true });
}
