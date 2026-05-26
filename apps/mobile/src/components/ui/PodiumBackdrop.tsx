import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Podium gradient backdrop — gold/silver/bronze diagonal gradient sitting
 * behind a leaderboard card's content. Mirrors the web's
 * `bg-gradient-to-br from-amber-300 to-amber-500` family of treatments.
 *
 * Absolute-positioned; render as first child of a `relative`/clipped parent.
 */

type Rank = 1 | 2 | 3;

const GRADIENTS: Record<
  Rank,
  { id: string; from: string; to: string }
> = {
  1: { id: 'podium-1', from: '#fcd34d', to: '#d97706' }, // amber-300 → amber-600
  2: { id: 'podium-2', from: '#e2e8f0', to: '#64748b' }, // slate-200 → slate-500
  3: { id: 'podium-3', from: '#fdba74', to: '#9a3412' }, // orange-300 → orange-800
};

export function PodiumBackdrop({ rank }: { rank: Rank }) {
  const g = GRADIENTS[rank];
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
        <Defs>
          <LinearGradient id={g.id} x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0%" stopColor={g.from} stopOpacity={0.32} />
            <Stop offset="100%" stopColor={g.to} stopOpacity={0.18} />
          </LinearGradient>
        </Defs>
        <Rect fill={`url(#${g.id})`} height="100" width="100" x="0" y="0" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
