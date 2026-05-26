import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Stop } from 'react-native-svg';

/**
 * Decorative angled fading speed-line background. Port of the web app's
 * `HeroSpeedLines`. Sits absolute-positioned behind hero content.
 */
export function HeroSpeedLines() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 1200 600"
        width="100%"
      >
        <Defs>
          <LinearGradient id="line-fade-1" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0%" stopColor="rgba(34,211,238,0)" />
            <Stop offset="45%" stopColor="rgba(34,211,238,0.55)" />
            <Stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </LinearGradient>
          <LinearGradient id="line-fade-2" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0%" stopColor="rgba(20,184,166,0)" />
            <Stop offset="50%" stopColor="rgba(20,184,166,0.42)" />
            <Stop offset="100%" stopColor="rgba(20,184,166,0)" />
          </LinearGradient>
        </Defs>
        <G transform="rotate(-8 600 300)">
          <Line
            stroke="url(#line-fade-1)"
            strokeWidth={1}
            x1="-100"
            x2="1300"
            y1="120"
            y2="120"
          />
          <Line
            stroke="url(#line-fade-2)"
            strokeWidth={1}
            x1="-100"
            x2="1300"
            y1="200"
            y2="200"
          />
          <Line
            stroke="url(#line-fade-2)"
            strokeWidth={1}
            x1="-100"
            x2="1300"
            y1="430"
            y2="430"
          />
          <Line
            stroke="url(#line-fade-1)"
            strokeWidth={1}
            x1="-100"
            x2="1300"
            y1="510"
            y2="510"
          />
        </G>
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
