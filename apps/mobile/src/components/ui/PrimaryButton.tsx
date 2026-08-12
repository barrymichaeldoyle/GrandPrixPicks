import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Trailing Ionicons glyph; defaults to the web CTA's forward arrow. */
  icon?: React.ComponentProps<typeof Ionicons>['name'] | null;
};

/**
 * The primary CTA: a flat accent fill with dark ink, matching the web
 * `primary` variant (`bg-accent text-text-on-accent rounded-sm`).
 *
 * This was a gradient pill with a white label, ported from the teal identity.
 * Two things were wrong with it by the time the accent became chartreuse. The
 * gradient ran between two shades of the same colour, so it was cost without
 * effect in a direction that has no gradients. More seriously the white label
 * sat on chartreuse at roughly 1.4:1, which is not a style question: it was
 * unreadable. Accent surfaces take `textOnAccent` ink.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward',
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`overflow-hidden rounded-sm ${
        disabled ? 'bg-surface-elevated' : 'bg-accent active:bg-accent-press'
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-center gap-2 py-3.5">
        <Text
          className={`text-sm font-semibold ${
            disabled ? 'text-text-disabled' : 'text-text-on-accent'
          }`}
        >
          {label}
        </Text>
        {icon ? (
          <Ionicons
            color={disabled ? colors.textDisabled : colors.textOnAccent}
            name={icon}
            size={15}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
