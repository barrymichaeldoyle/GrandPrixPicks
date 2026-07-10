import { useClerk } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';

import { api } from '../integrations/convex/api';
import {
  clearStoredExpoPushToken,
  getStoredExpoPushToken,
} from '../lib/pushRegistration';

/**
 * Signs out after unregistering this device's Expo push token, so a
 * signed-out device stops receiving the previous account's notifications.
 * The mutation requires auth, so it must run before Clerk tears the
 * session down — and sign-out proceeds even if it fails.
 */
export function useSignOutWithCleanup() {
  const { signOut } = useClerk();
  const deleteToken = useMutation(api.push.deleteExpoPushToken);

  return async function signOutWithCleanup() {
    try {
      const token = await getStoredExpoPushToken();
      if (token) {
        await deleteToken({ token });
        await clearStoredExpoPushToken();
      }
    } catch (err) {
      console.warn('[auth] push token cleanup failed on sign-out', err);
    }
    await signOut();
  };
}
