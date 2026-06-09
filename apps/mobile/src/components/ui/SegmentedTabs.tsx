import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';

type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  value: T;
  options: ReadonlyArray<SegmentOption<T>>;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              isActive ? styles.segmentActive : null,
              pressed && !isActive ? styles.segmentPressed : null,
            ]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    padding: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  labelActive: {
    color: colors.text,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: colors.buttonAccent,
  },
  segmentPressed: {
    backgroundColor: colors.surfaceElevated,
  },
});
