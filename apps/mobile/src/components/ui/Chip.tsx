import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii } from '../../theme/tokens';

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function Chip({ label, active, onPress, disabled = false }: ChipProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        active ? styles.active : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={[styles.label, active ? styles.activeLabel : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  activeLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
