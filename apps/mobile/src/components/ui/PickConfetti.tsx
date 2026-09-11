import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors } from '../../theme/tokens';

const palette = [colors.accent, colors.podiumGold, colors.podiumSilver];
export function PickConfetti({ nonce }: { nonce: number }) {
  const [progress] = useState(() => new Animated.Value(1));
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || cancelled || !nonce) {
        return;
      }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      cancelled = true;
      progress.stopAnimation();
    };
  }, [nonce, progress]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      {Array.from({ length: 32 }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: height * 0.2,
            left: width / 2,
            width: 5,
            height: 10,
            backgroundColor: palette[i % palette.length],
            opacity: progress.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: [1, 1, 0],
            }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, ((((i * 37) % 101) - 50) * width) / 70],
                }),
              },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.25, 1],
                  outputRange: [0, -70 - (i % 5) * 12, height * 0.65],
                }),
              },
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 540}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}
