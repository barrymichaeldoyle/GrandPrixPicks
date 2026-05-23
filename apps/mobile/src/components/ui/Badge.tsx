import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';

type BadgeVariant =
  | 'sprint'
  | 'upcoming'
  | 'not_yet_open'
  | 'locked'
  | 'submitted'
  | 'finished'
  | 'cancelled'
  | 'accent'
  | 'warning'
  | 'neutral';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const statusDefaults: Partial<
  Record<BadgeVariant, { icon: IoniconName; label: string }>
> = {
  upcoming: { icon: 'time-outline', label: 'Open for predictions' },
  not_yet_open: { icon: 'lock-closed-outline', label: 'Not yet open' },
  locked: { icon: 'lock-closed-outline', label: 'Predictions locked' },
  submitted: { icon: 'checkmark-circle-outline', label: 'Submitted' },
  finished: { icon: 'trophy-outline', label: 'Finished' },
  cancelled: { icon: 'close-circle-outline', label: 'Called Off' },
};

type BadgeProps = {
  variant: BadgeVariant;
  /** Override the default icon (use null to hide it). */
  icon?: IoniconName | null;
  /** Override the default label. */
  children?: ReactNode;
  /** Compact horizontal padding for inline-grid contexts. */
  compact?: boolean;
};

export function Badge({ variant, icon, children, compact }: BadgeProps) {
  const defaults = statusDefaults[variant];
  const iconName: IoniconName | null =
    icon === null ? null : (icon ?? defaults?.icon ?? null);
  const label = children ?? defaults?.label ?? null;
  const variantStyles = VARIANT_STYLES[variant];

  return (
    <View
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        { backgroundColor: variantStyles.bg, borderColor: variantStyles.border },
      ]}
    >
      {iconName ? (
        <Ionicons color={variantStyles.fg} name={iconName} size={11} />
      ) : null}
      {label ? (
        <Text style={[styles.label, { color: variantStyles.fg }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; border: string; fg: string }
> = {
  sprint: {
    bg: 'rgba(126, 34, 206, 0.22)',
    border: 'rgba(168, 85, 247, 0.55)',
    fg: '#e9d5ff',
  },
  upcoming: {
    bg: colors.successMuted,
    border: 'rgba(52, 211, 153, 0.35)',
    fg: colors.success,
  },
  submitted: {
    bg: colors.successMuted,
    border: 'rgba(52, 211, 153, 0.35)',
    fg: colors.success,
  },
  not_yet_open: {
    bg: colors.surfaceMuted,
    border: colors.border,
    fg: colors.textMuted,
  },
  finished: {
    bg: colors.surfaceMuted,
    border: colors.border,
    fg: colors.textMuted,
  },
  locked: {
    bg: 'rgba(251, 191, 36, 0.18)',
    border: 'rgba(251, 191, 36, 0.55)',
    fg: colors.warning,
  },
  warning: {
    bg: 'rgba(251, 191, 36, 0.18)',
    border: 'rgba(251, 191, 36, 0.55)',
    fg: colors.warning,
  },
  cancelled: {
    bg: 'rgba(248, 113, 113, 0.15)',
    border: 'rgba(248, 113, 113, 0.55)',
    fg: colors.error,
  },
  accent: {
    bg: colors.accentMuted,
    border: colors.accent,
    fg: colors.accent,
  },
  neutral: {
    bg: colors.surfaceElevated,
    border: colors.borderStrong,
    fg: colors.text,
  },
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
