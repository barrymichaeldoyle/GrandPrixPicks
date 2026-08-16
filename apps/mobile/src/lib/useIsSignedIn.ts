import { useUser } from '@clerk/expo';

import { useMobileConfig } from '../providers/mobile-config';

/**
 * Whether there is a signed-in viewer, honouring the no-Clerk dev mode the old
 * `AuthGate` handled. Without Clerk configured everything behaves as signed in,
 * which is what a local run against a bare backend expects.
 */
export function useIsSignedIn(): boolean {
  const { clerkEnabled } = useMobileConfig();
  const { isSignedIn } = useUser();
  return !clerkEnabled || Boolean(isSignedIn);
}
