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
 * Keep the SSR session assumption until the browser SDK finishes loading,
 * then trust Clerk in both directions, including an expired session that
 * never confirms signed in. See `deriveViewerSession`.
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
