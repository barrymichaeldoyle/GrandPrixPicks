import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radii } from '../../theme/tokens';

const HEADER_HEIGHT = 58;
const FLAG_WIDTH = 78;
const BORDER_WIDTH = 3;

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
    <View style={styles.card}>
      <View style={styles.header}>
        <Animated.View style={[styles.flagFrame, { opacity }]} />
        <View style={styles.headerText}>
          <Animated.View style={[styles.roundBar, { opacity }]} />
          <Animated.View style={[styles.nameBar, { opacity }]} />
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <Animated.View style={[styles.badge, { opacity }]} />
          <Animated.View style={[styles.badge, { opacity }]} />
        </View>
        <View style={styles.schedulePanel}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.scheduleRow}>
              <Animated.View style={[styles.scheduleLabelBar, { opacity }]} />
              <Animated.View style={[styles.scheduleTimeBar, { opacity }]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 18,
    width: 64,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  body: {
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: BORDER_WIDTH,
    overflow: 'hidden',
  },
  flagFrame: {
    backgroundColor: colors.surfaceMuted,
    borderRightWidth: BORDER_WIDTH,
    borderRightColor: colors.border,
    height: HEADER_HEIGHT,
    width: FLAG_WIDTH,
  },
  header: {
    alignItems: 'stretch',
    borderBottomColor: colors.border,
    borderBottomWidth: BORDER_WIDTH,
    flexDirection: 'row',
    height: HEADER_HEIGHT,
  },
  headerText: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  nameBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 14,
    width: '80%',
  },
  roundBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 4,
    height: 9,
    width: 56,
  },
  scheduleLabelBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    height: 10,
    width: 56,
  },
  schedulePanel: {
    backgroundColor: 'rgba(51, 65, 85, 0.35)',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scheduleTimeBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    height: 10,
    width: 110,
  },
});
