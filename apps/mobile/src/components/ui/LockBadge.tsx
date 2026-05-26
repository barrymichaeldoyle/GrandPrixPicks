import type { LockStatusViewModel } from '@grandprixpicks/shared/picks';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';
import { Numeral } from './Numeral';

type LockBadgeProps = {
  lockStatus: LockStatusViewModel;
};

export function LockBadge({ lockStatus }: LockBadgeProps) {
  const isWarning = lockStatus.badgeTone === 'warning';
  const isLocked = lockStatus.isLocked;
  const tone = isLocked ? 'muted' : isWarning ? 'warning' : 'gain';

  return (
    <View
      style={[
        styles.badge,
        isLocked ? styles.locked : isWarning ? styles.warning : styles.open,
      ]}
    >
      <Numeral tone={tone} variant="small">
        {lockStatus.label}
      </Numeral>
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
  locked: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  open: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warning,
  },
});
