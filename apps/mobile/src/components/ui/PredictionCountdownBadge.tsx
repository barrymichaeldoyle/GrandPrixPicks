import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { useNow } from '../../lib/useNow';
import { colors, radii } from '../../theme/tokens';

type PredictionCountdownBadgeProps = {
  /** Timestamp (ms) when predictions lock. */
  predictionLockAt: number;
  /** Label suffix mode. */
  labelMode?: 'predict' | 'lock';
};

const PULSE_THRESHOLD_MS = 60 * 60 * 1000; // pulse in the final hour

export function PredictionCountdownBadge({
  predictionLockAt,
  labelMode = 'predict',
}: PredictionCountdownBadgeProps) {
  const now = useNow();
  const msRemaining = predictionLockAt - now;
  const pulse = useRef(new Animated.Value(1)).current;
  const shouldPulse = msRemaining > 0 && msRemaining <= PULSE_THRESHOLD_MS;

  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, shouldPulse]);

  if (msRemaining <= 0) {
    return null;
  }

  const label = formatLockCountdown(msRemaining);
  const suffix = labelMode === 'lock' ? 'until lock' : 'to predict';

  return (
    <Animated.View style={[styles.badge, { opacity: pulse }]}>
      <Text style={styles.label}>
        {label} {suffix}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    borderColor: 'rgba(45, 212, 191, 0.55)',
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    color: colors.accentHover,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
