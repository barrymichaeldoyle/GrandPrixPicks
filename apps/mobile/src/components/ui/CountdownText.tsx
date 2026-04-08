import type { LockStatusViewModel } from '@grandprixpicks/shared/picks';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/tokens';

type CountdownTextProps = {
  lockStatus: LockStatusViewModel;
  style?: StyleProp<TextStyle>;
};

export function CountdownText({ lockStatus, style }: CountdownTextProps) {
  const isWarning = lockStatus.badgeTone === 'warning';
  const isLocked = lockStatus.isLocked;

  const textColor = isLocked
    ? colors.textMuted
    : isWarning
      ? colors.warning
      : colors.success;

  return (
    <Text style={[styles.text, { color: textColor }, style]}>
      {lockStatus.label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
