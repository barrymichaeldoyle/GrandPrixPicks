import type { LockStatusViewModel } from '@grandprixpicks/shared/picks';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';

type LockBadgeProps = {
  lockStatus: LockStatusViewModel;
};

export function LockBadge({ lockStatus }: LockBadgeProps) {
  const isWarning = lockStatus.badgeTone === 'warning';
  const isLocked = lockStatus.isLocked;

  return (
    <View
      style={[
        styles.badge,
        isLocked ? styles.locked : isWarning ? styles.warning : styles.open,
      ]}
    >
      <Text
        style={[
          styles.label,
          isLocked
            ? styles.lockedText
            : isWarning
              ? styles.warningText
              : styles.openText,
        ]}
      >
        {lockStatus.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  locked: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  lockedText: {
    color: colors.textMuted,
  },
  open: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  openText: {
    color: colors.success,
  },
  warning: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warning,
  },
  warningText: {
    color: colors.warning,
  },
});
