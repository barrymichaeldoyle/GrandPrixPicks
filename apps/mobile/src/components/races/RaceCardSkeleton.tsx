import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';

export function RaceCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.row}>
      <View style={styles.dateBlock}>
        <Animated.View style={[styles.monthBar, { opacity }]} />
        <Animated.View style={[styles.dayBar, { opacity }]} />
      </View>
      <View style={styles.divider} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Animated.View style={[styles.flag, { opacity }]} />
          <Animated.View style={[styles.metaBar, { opacity }]} />
        </View>
        <Animated.View style={[styles.nameBar, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 8,
  },
  dateBlock: {
    alignItems: 'center',
    gap: 6,
    minWidth: 44,
  },
  dayBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 18,
    width: 32,
  },
  divider: {
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    width: StyleSheet.hairlineWidth,
  },
  flag: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 14,
    width: 22,
  },
  metaBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 10,
    width: 80,
  },
  monthBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 10,
    width: 28,
  },
  nameBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 16,
    width: '78%',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
