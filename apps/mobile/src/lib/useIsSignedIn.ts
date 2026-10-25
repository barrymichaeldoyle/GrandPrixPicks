import { useAuth } from '@clerk/expo';

import { useMobileConfig } from '../providers/mobile-config';

/**
 * Whether there is a signed-in viewer, honouring the no-Clerk dev mode the old
 * `AuthGate` handled. Without Clerk configured everything behaves as signed in,
 * which is what a local run against a bare backend expects.
 *
 * Session (`useAuth`) rather than user resource (`useUser`): after SSO,
 * `setActive` flips the session immediately, and that is the signal that
 * should hide SignIn. Waiting on `useUser` left the sheet up until the user
 * object hydrated.
 */
export function useIsSignedIn(): boolean {
  const { clerkEnabled } = useMobileConfig();
  const { isSignedIn } = useAuth();
  return !clerkEnabled || Boolean(isSignedIn);
}

/**
 * True only once Clerk has confirmed there is no viewer.
 *
 * `useIsSignedIn` reads Clerk's not-yet-loaded `undefined` as signed out,
 * which is right for gating a sign-in button and wrong for deciding the
 * device's drafts are a guest's: for that first moment of a launch, a
 * returning player's unsaved edits were shown as a guest card.
 */
export function useIsConfirmedSignedOut(): boolean {
  const { clerkEnabled } = useMobileConfig();
  const { isLoaded, isSignedIn } = useAuth();
  return clerkEnabled && isLoaded && !isSignedIn;
}
