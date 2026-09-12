import { useEffect } from 'react';
import { AccessibilityInfo, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 80;
const DURATION_MS = 2500;
const palette = ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'];

type Particle = {
  color: string;
  horizontalVelocity: number;
  verticalVelocity: number;
  size: number;
  rotation: number;
  wobble: number;
};

// A repeatable spread keeps each render stable while retaining the varied look
// of canvas-confetti's default particles.
function pseudoRandom(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const particles: Particle[] = Array.from(
  { length: PARTICLE_COUNT },
  (_, index) => {
    const angle = ((60 + pseudoRandom(index, 1) * 60) * Math.PI) / 180;
    const velocity = 0.72 + pseudoRandom(index, 2) * 0.55;

    return {
      color: palette[index % palette.length],
      horizontalVelocity: Math.cos(angle) * velocity,
      verticalVelocity: Math.sin(angle) * velocity,
      size: 0.7 + pseudoRandom(index, 3) * 0.55,
      rotation: (pseudoRandom(index, 4) > 0.5 ? 1 : -1) * 720,
      wobble: pseudoRandom(index, 5) * Math.PI * 2,
    };
  },
);

function ConfettiParticle({
  particle,
  progress,
  width,
  height,
}: {
  particle: Particle;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const time = progress.value;
    const distance = width * 0.47;
    const rise = height * 0.38;
    const gravity = height * 0.78 * time * time;
    const wobble = Math.sin(time * Math.PI * 7 + particle.wobble) * 8 * time;

    return {
      opacity: interpolate(time, [0, 0.82, 1], [1, 1, 0]),
      transform: [
        {
          translateX: particle.horizontalVelocity * distance * time + wobble,
        },
        {
          translateY: -particle.verticalVelocity * rise * time + gravity,
        },
        { rotate: `${particle.rotation * time}deg` },
        {
          scaleY: Math.max(
            0.12,
            Math.abs(Math.cos(time * Math.PI * 5 + particle.wobble)),
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: height * 0.7,
          left: width / 2,
          width: 7 * particle.size,
          height: 10 * particle.size,
          borderRadius: 1,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

export function PickConfetti({ nonce }: { nonce: number }) {
  const progress = useSharedValue(1);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || cancelled || !nonce) {
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      cancelled = true;
      cancelAnimation(progress);
    };
  }, [nonce, progress]);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      {particles.map((particle, index) => (
        <ConfettiParticle
          key={index}
          particle={particle}
          progress={progress}
          width={width}
          height={height}
        />
      ))}
    </View>
  );
}
