import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

/**
 * Says plainly what a signed-out card is and is not.
 *
 * Letting somebody build picks before they have an account is only fair if
 * they know the terms: the picks live on this phone until they sign in, and
 * they only count if that happens before the session locks. Leaving that
 * implied would mean a reader who built a card, waited, and quietly scored
 * nothing.
 */
export function SignedOutPicksNotice({
  lockLabel,
  onSignIn,
}: {
  /** Human-readable lock time for the session being edited, if known. */
  lockLabel?: string;
  onSignIn: () => void;
}) {
  return (
    <View className="mb-3 gap-2 rounded-lg border border-accent/40 bg-accent-muted px-3.5 py-3">
      <View className="flex-row items-center gap-2">
        <Ionicons color={colors.accent} name="information-circle" size={16} />
        <Text className="text-foreground text-[13px] font-bold">
          Your picks are saved on this phone
        </Text>
      </View>
      <Text className="text-muted text-[12px] leading-[17px]">
        {lockLabel
          ? `They only count once you sign in, and they have to be in before this session locks on ${lockLabel}.`
          : 'They only count once you sign in, and they have to be in before the session locks.'}
      </Text>
      <Pressable
        accessibilityLabel="Sign in so your picks count"
        accessibilityRole="button"
        className="mt-0.5 self-start rounded-sm bg-accent px-3 py-2 active:bg-accent-press"
        onPress={onSignIn}
      >
        <Text className="text-[12px] font-bold text-text-on-accent">
          Sign in so they count
        </Text>
      </Pressable>
    </View>
  );
}
