import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';

import { api } from '../integrations/convex/api';
import {
  clearStoredExpoPushToken,
  getStoredExpoPushToken,
} from '../lib/pushRegistration';

/**
 * Deletes the account in-app (App Review Guideline 5.1.1(v)). Deleting the
 * Clerk user fires the user.deleted webhook, which removes all Convex data;
 * the device's push token is unregistered first while the session can still
 * authenticate the mutation. Clerk ends the session itself, dropping the
 * app back to the signed-out gate.
 */
export function useDeleteAccount() {
  const { user } = useUser();
  const deleteToken = useMutation(api.push.deleteExpoPushToken);

  return async function deleteAccount() {
    try {
      const token = await getStoredExpoPushToken();
      if (token) {
        await deleteToken({ token });
        await clearStoredExpoPushToken();
      }
    } catch (err) {
      console.warn('[account] push token cleanup failed before deletion', err);
    }
    await user?.delete();
  };
}
