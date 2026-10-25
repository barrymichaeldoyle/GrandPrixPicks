import { useMutation } from 'convex/react';

import { api } from '../integrations/convex/api';
import { clearAllConnectedDrafts } from '../lib/picksDrafts';
import { clearPersistedQueries } from '../lib/persistedQueries';
import {
  clearStoredExpoPushToken,
  forgetTokenSave,
  getStoredExpoPushToken,
} from '../lib/pushRegistration';

/**
 * How long leaving an account waits on the push-token mutation. Convex queues
 * mutations while the socket is down and never rejects them, so offline the
 * await never returned and sign-out spun until the phone reconnected.
 */
const PUSH_CLEANUP_TIMEOUT_MS = 4_000;

/**
 * The two halves of leaving an account on this device.
 *
 * `unregisterPush` has to run while the session can still authenticate the
 * mutation, and gives up after a few seconds rather than hold sign-out
 * hostage to the network. `clearLocalData` drops what the outgoing player
 * left on the phone: the offline query cache and any pick drafts.
 */
export function useDeviceAccountCleanup() {
  const deleteToken = useMutation(api.push.deleteExpoPushToken);

  async function unregisterPush() {
    await forgetTokenSave();
    try {
      const token = await getStoredExpoPushToken();
      if (!token) {
        return;
      }
      const deleted = await Promise.race([
        deleteToken({ token }).then(() => true),
        new Promise<false>((resolve) =>
          setTimeout(() => resolve(false), PUSH_CLEANUP_TIMEOUT_MS),
        ),
      ]);
      // Only forget the token once the server has: otherwise the next
      // signed-in launch could not tell it still needed unregistering.
      if (deleted) {
        await clearStoredExpoPushToken();
      }
    } catch (err) {
      console.warn('[account] push token cleanup failed', err);
    }
  }

  async function clearLocalData(userId: string | null | undefined) {
    if (userId) {
      clearPersistedQueries(userId);
    }
    try {
      await clearAllConnectedDrafts();
    } catch (err) {
      console.warn('[account] draft cleanup failed', err);
    }
  }

  return { unregisterPush, clearLocalData };
}
