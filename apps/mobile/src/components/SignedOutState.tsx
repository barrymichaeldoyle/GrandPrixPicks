import { Ionicons } from '@expo/vector-icons';

import { useSignInSheet } from '../lib/useSignInSheet';
import { colors } from '../theme/tokens';
import { Pressable, ScrollView, Text, View } from '../tw';

type SignedOutStateProps = {
  /** Micro label above the title. Names the screen, not the gate. */
  eyebrow: string;
  title: string;
  /** One sentence on what this screen does once you are signed in. */
  description: string;
  /**
   * What this screen holds, as rows. These are its real contents: the list is
   * only worth its space because a reader can tell from it whether signing in
   * gets them what they came for.
   */
  behind: readonly string[];
  actionLabel?: string;
};

/**
 * The signed-out state for a screen that genuinely needs an account.
 *
 * Most of the app does not need one any more, and that is the point: the two
 * screens that still do are now the exception, so they have to say why rather
 * than let the reader assume the app is broken. It mirrors the web
 * `SignInPrompt`, including its main rule: name what is behind the gate. A
 * centred icon over "Sign in required" makes a screen with plenty behind it
 * look like it has nothing.
 *
 * Notifications and Settings previously answered signed out by rendering their
 * own empty states, which read as fact rather than as a gate: Notifications
 * said "No notifications yet", and Settings offered a working-looking form of
 * placeholder values whose every toggle would have failed to save.
 */
export function SignedOutState({
  eyebrow,
  title,
  description,
  behind,
  actionLabel = 'Sign in or create an account',
}: SignedOutStateProps) {
  const openSignIn = useSignInSheet();

  return (
    <ScrollView
      className="flex-1 bg-page"
      contentContainerClassName="gap-5 p-4 pt-8"
    >
      <View className="gap-2">
        <Text className="text-muted text-[10px] font-extrabold uppercase">
          {eyebrow}
        </Text>
        <Text className="text-foreground text-[26px] font-light">{title}</Text>
        <Text className="text-muted text-sm leading-5">{description}</Text>
      </View>

      {/* A gate is a container awaiting input, so the panel naming what is
          behind it takes the system's dashed hairline. */}
      <View className="gap-2.5 rounded-lg border border-dashed border-border p-4">
        {behind.map((row) => (
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
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        className="items-center rounded-sm bg-accent px-4 py-3.5 active:bg-accent-press"
        onPress={openSignIn}
      >
        <Text className="text-sm font-bold text-text-on-accent">
          {actionLabel}
        </Text>
      </Pressable>

      {/* Never a dead end: the rest of the app works without an account, and
          a reader who declines the gate should land somewhere, not bounce. */}
      <Text className="text-muted text-center text-xs leading-[17px]">
        You can keep browsing races, picks and standings without an account.
      </Text>
    </ScrollView>
  );
}
