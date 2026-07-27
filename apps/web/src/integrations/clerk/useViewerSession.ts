import {
  type ViewerSession,
  useViewerSessionContext,
} from './viewer-session-context';

/**
 * First-paint-stable auth state for the header / nav chrome.
 *
 * Clerk's client SDK can briefly report signed-out during boot — `isLoaded`
 * flips true while the active session is still being confirmed. Downgrading to
 * signed-out UI in that window flashes the "Sign in" button (and signed-out nav)
 * for a returning user, even though SSR already rendered them signed in.
 *
 * So we treat the SSR-resolved session (`initialAuth`, derived from Clerk's
 * durable `__client_uat` cookie) as authoritative *until Clerk first confirms a
 * session*. After that confirmation Clerk becomes authoritative in both
 * directions, so a genuine sign-out downgrades to signed-out chrome.
 *
 * The earlier version of this assumed sign-out reloaded the app and reset
 * `initialAuth`. It does not: `afterSignOutUrl` is a client navigation, SSR
 * never re-runs, and the stale signed-in `initialAuth` left the header stuck on
 * its avatar placeholder forever. See `deriveViewerSession`.
 *
 * - `isSignedIn`: render signed-in chrome (nav links, avatar). True as soon as
 *   SSR says so, and stays true through Clerk's boot.
 * - `confirmedSignedIn`: Clerk has loaded and confirmed the session — safe to
 *   mount components that need a live authenticated client (UserButton, the
 *   notification bell).
 */
export function useViewerSession(): ViewerSession {
  return useViewerSessionContext();
}
