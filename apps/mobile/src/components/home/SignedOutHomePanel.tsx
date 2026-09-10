import { Ionicons } from '@expo/vector-icons';

import { useSignInSheet } from '../../lib/useSignInSheet';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

/**
 * The account path on a home screen that is otherwise fully browsable.
 *
 * Home used to answer a signed-out visitor with the season's top players and a
 * Follow button beside each one. Following is the one thing on that screen
 * that cannot work without an account, so every tap failed silently, and a
 * list of strangers is not what somebody opening an F1 app for the first time
 * came for. This says what an account is for instead.
 *
 * Deliberately below the hero: the countdown and the picks button are the
 * reason to be here, and the picks screen takes a draft without an account.
 */
const BEHIND = [
  'Your Top 5 scored against the real classification',
  'Teammate head-to-heads on every session',
  'Season and weekend leaderboards',
  'Private leagues with your friends',
] as const;

export function SignedOutHomePanel() {
  const openSignIn = useSignInSheet();

  return (
    <View className="gap-3.5 rounded-lg border border-dashed border-border p-4">
      <Text className="text-foreground text-[15px] font-bold">
        Picks count once you have an account
      </Text>

      <View className="gap-2">
        {BEHIND.map((row) => (
          <View className="flex-row items-start gap-2.5" key={row}>
            <Ionicons
              color={colors.accent}
              name="checkmark"
              size={15}
              style={{ marginTop: 1 }}
            />
            <Text className="text-foreground flex-1 text-[13px] leading-[19px]">
              {row}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityLabel="Sign in or create an account"
        accessibilityRole="button"
        className="items-center rounded-sm bg-accent px-4 py-3 active:bg-accent-press"
        onPress={openSignIn}
      >
        <Text className="text-sm font-bold text-text-on-accent">
          Sign in or create an account
        </Text>
      </Pressable>
    </View>
  );
}
