import { useMutation } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

import { api } from '../integrations/convex/api';
import {
  hasHandledPushPrePrompt,
  markPushPrePromptHandled,
  obtainExpoPushToken,
} from '../lib/pushRegistration';

/**
 * iOS shows the system notification prompt exactly once, so it must not be
 * spent at launch. This offers an in-app pre-prompt right after the user's
 * first successful pick save — the moment reminders become obviously useful.
 * Declining the pre-prompt leaves the system prompt unspent (Settings can
 * re-offer it); accepting triggers the real permission request.
 */
export function useOfferPushAfterFirstSave() {
  const saveToken = useMutation(api.push.saveExpoPushToken);

  return async function maybeOfferPush() {
    if (await hasHandledPushPrePrompt()) {
      return;
    }
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'undetermined') {
      // Already granted (registration is silent) or already denied.
      await markPushPrePromptHandled();
      return;
    }

    Alert.alert(
      'Never miss a session',
      'Get a reminder before picks lock and a ping when results land.',
      [
        {
          style: 'cancel',
          text: 'Not now',
          onPress: () => void markPushPrePromptHandled(),
        },
        {
          text: 'Turn on',
          onPress: () => {
            void (async () => {
              await markPushPrePromptHandled();
              const token = await obtainExpoPushToken();
              if (token) {
                await saveToken({ token }).catch((err: unknown) => {
                  console.warn('[notifications] saveExpoPushToken failed', err);
                });
              }
            })();
          },
        },
      ],
    );
  };
}
