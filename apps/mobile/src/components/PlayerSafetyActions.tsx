import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert } from 'react-native';

import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { userFacingMessage } from '../lib/userFacingError';
import { useIsSignedIn } from '../lib/useIsSignedIn';
import { useToast } from '../providers/ToastProvider';
import { Pressable, Text, View } from '../tw';

/**
 * Report and block on another player's profile, matching web's
 * `PlayerSafetyActions`. App Store guideline 1.2 asks for both wherever
 * players see each other's names and photos.
 *
 * A report goes to the support inbox. A block unfollows both ways, stops
 * either following again and hides the rest of the profile; it does not take
 * the player off leaderboards.
 */
export function PlayerSafetyActions({
  userId,
  username,
  blocked,
}: {
  userId: ConvexId<'users'>;
  username: string | undefined;
  blocked: boolean;
}) {
  const isSignedIn = useIsSignedIn();
  const { showToast } = useToast();
  const report = useMutation(api.moderation.reportUser);
  const block = useMutation(api.moderation.blockUser);
  const unblock = useMutation(api.moderation.unblockUser);
  const [reported, setReported] = useState(false);

  if (!isSignedIn) {
    return null;
  }

  const name = username ? `@${username}` : 'this player';

  async function run(
    action: () => Promise<unknown>,
    success: string,
    onDone?: () => void,
  ) {
    try {
      await action();
      onDone?.();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(success, 'success');
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        userFacingMessage(err, 'That did not go through. Try again.'),
        'error',
      );
    }
  }

  function confirmReport() {
    Alert.alert(
      `Report ${name}?`,
      "We'll review their username, display name and photo.",
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Report',
          onPress: () =>
            void run(
              () => report({ userId }),
              'Report sent',
              () => setReported(true),
            ),
        },
      ],
    );
  }

  function confirmBlock() {
    Alert.alert(
      `Block ${name}?`,
      "You'll unfollow each other and won't see each other's activity. Neither of you can follow the other. They stay on leaderboards.",
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Block',
          onPress: () => void run(() => block({ userId }), `${name} blocked`),
        },
      ],
    );
  }

  if (blocked) {
    return (
      <View className="flex-row items-center justify-between gap-3 border-y border-border py-3">
        <Text className="text-muted flex-1 text-sm">You blocked {name}.</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() =>
            void run(() => unblock({ userId }), `${name} unblocked`)
          }
        >
          <Text className="text-sm font-bold text-accent">Unblock</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row justify-center gap-8">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: reported }}
        disabled={reported}
        hitSlop={8}
        onPress={confirmReport}
      >
        <Text className="text-muted text-sm font-semibold">
          {reported ? 'Reported' : 'Report'}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={confirmBlock}>
        <Text className="text-muted text-sm font-semibold">Block</Text>
      </Pressable>
    </View>
  );
}
