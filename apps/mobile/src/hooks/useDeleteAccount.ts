import { useUser } from '@clerk/expo';

import { useDeviceAccountCleanup } from './useDeviceAccountCleanup';

/**
 * Deletes the account in-app (App Review Guideline 5.1.1(v)). Deleting the
 * Clerk user fires the user.deleted webhook, which removes all Convex data;
 * the device's push token is unregistered first while the session can still
 * authenticate the mutation. Clerk ends the session itself, dropping the
 * app back to the signed-out gate.
 *
 * Local data is cleared only once the deletion has gone through. Clearing it
 * first meant a failed delete (a network drop, Clerk asking to re-verify)
 * left the player signed in with their offline cache already gone.
 */
export function useDeleteAccount() {
  const { user } = useUser();
  const { unregisterPush, clearLocalData } = useDeviceAccountCleanup();

  return async function deleteAccount() {
    if (!user) {
      return;
    }
    await unregisterPush();
    await user.delete();
    await clearLocalData(user.id);
  };
}
