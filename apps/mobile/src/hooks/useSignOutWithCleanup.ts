import { useAuth, useClerk } from '@clerk/expo';
import { useRef } from 'react';

import { useDeviceAccountCleanup } from './useDeviceAccountCleanup';

/**
 * Signs out after unregistering this device's Expo push token, so a
 * signed-out device stops receiving the previous account's notifications.
 * The mutation requires auth, so it must run before Clerk tears the
 * session down, and sign-out proceeds even if it fails or times out.
 */
export function useSignOutWithCleanup() {
  const { signOut } = useClerk();
  const { userId } = useAuth();
  const { unregisterPush, clearLocalData } = useDeviceAccountCleanup();
  // One sign-out at a time: Settings' confirm has no pending state, and a
  // second tap used to start a second cleanup alongside the first.
  const inFlight = useRef<Promise<void> | null>(null);

  return function signOutWithCleanup() {
    inFlight.current ??= (async () => {
      try {
        await unregisterPush();
        // The next person to hold this phone should not open on these picks.
        await clearLocalData(userId);
        await signOut();
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  };
}
