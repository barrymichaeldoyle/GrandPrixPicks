import { useAuth } from '@clerk/react';

import { useInitialAuth } from './initial-auth';

/**
 * First-paint-stable auth state for the header / nav chrome.
 *
 * Clerk's client SDK can briefly report signed-out during boot — `isLoaded`
 * flips true while the active session is still being confirmed. Downgrading to
 * signed-out UI in that window flashes the "Sign in" button (and signed-out nav)
 * for a returning user, even though SSR already rendered them signed in.
 *
 * So we treat the SSR-resolved session (`initialAuth`, derived from Clerk's
 * durable `__client_uat` cookie) as authoritative for this page load: Clerk can
 * only *upgrade* us to a confirmed session — swapping the neutral avatar
 * placeholder for the real `UserButton` — never *downgrade* to signed-out. A
 * genuine sign-out reloads the app, which resets `initialAuth`.
 *
 * - `isSignedIn`: render signed-in chrome (nav links, avatar). True as soon as
 *   SSR says so, and stays true through Clerk's boot.
 * - `confirmedSignedIn`: Clerk has loaded and confirmed the session — safe to
 *   mount components that need a live authenticated client (UserButton, the
 *   notification bell).
 */
export function useViewerSession(): {
  isSignedIn: boolean;
  confirmedSignedIn: boolean;
} {
  const { isLoaded, isSignedIn: clientSignedIn } = useAuth();
  const initialAuth = useInitialAuth();
  const confirmedSignedIn = isLoaded && !!clientSignedIn;
  return {
    isSignedIn: initialAuth.isSignedIn || confirmedSignedIn,
    confirmedSignedIn,
  };
}
