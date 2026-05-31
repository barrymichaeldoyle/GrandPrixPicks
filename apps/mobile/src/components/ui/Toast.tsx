import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '../../theme/tokens';

type ToastVariant = 'success' | 'error' | 'info';

export type ToastState = {
  message: string;
  variant: ToastVariant;
  /** Bump this every time you want to re-show, even with the same message. */
  nonce: number;
} | null;

type ToastProps = {
  state: ToastState;
  /** Auto-dismiss after this many ms. Default 2200ms. */
  durationMs?: number;
  /** Called after the toast animates out so the parent can clear `state`. */
  onDismiss?: () => void;
};

const VARIANT_STYLES: Record<
  ToastVariant,
  { bg: string; border: string; fg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  success: {
    bg: colors.successMuted,
    border: 'rgba(52, 211, 153, 0.6)',
    fg: colors.success,
    icon: 'checkmark-circle',
  },
  error: {
    bg: 'rgba(248, 113, 113, 0.18)',
    border: 'rgba(248, 113, 113, 0.6)',
    fg: colors.error,
    icon: 'alert-circle',
  },
  info: {
    bg: colors.accentMuted,
    border: colors.accent,
    fg: colors.accent,
    icon: 'information-circle',
  },
};

/**
 * Slide-up toast anchored to the bottom of the screen. Controlled via the
 * `state` prop — set to an object to show, set to `null` to clear immediately.
 * Auto-dismisses after `durationMs` (calls `onDismiss` once the slide-out
 * animation finishes).
 *
 * Render once near the root of a screen so multiple sources can drive it.
 */
export function Toast({ state, durationMs = 2200, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translate = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!state) {
      return;
    }
    translate.value = withSpring(0, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 180 });
    const timeout = setTimeout(() => {
      translate.value = withTiming(120, { duration: 220 });
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        // Hop off the worklet thread before calling React state setters.
        if (finished && onDismiss) {
          runOnJS(onDismiss)();
        }
      });
    }, durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs, onDismiss, opacity, state, translate]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  if (!state) {
    return null;
  }
  const variant = VARIANT_STYLES[state.variant];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}
    >
      <Animated.View
        style={[
          styles.toast,
          { backgroundColor: variant.bg, borderColor: variant.border },
          containerStyle,
        ]}
      >
        <Ionicons color={variant.fg} name={variant.icon} size={18} />
        <Text numberOfLines={2} style={[styles.message, { color: variant.fg }]}>
          {state.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  toast: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  wrap: {
    bottom: 0,
    left: 16,
    position: 'absolute',
    right: 16,
  },
});
