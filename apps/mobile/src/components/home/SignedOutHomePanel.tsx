import { Ionicons } from '../ui/Ionicons';

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
 * Deliberately below the weekend card, which takes a draft without an
 * account: the picks are the reason to be here, and this says what signing
 * in adds. The boards are not on the list because a guest can already read
 * them on the Leaderboard tab.
 */
const BEHIND = [
  'Your Top 5 and team-mate picks scored on every session',
  'Your place on the weekend and season boards',
  'A reminder before picks lock, and results when they land',
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
