import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../theme/tokens';
import { View } from '../../tw';

/**
 * Page atmosphere — port of the web background's teal glow that radiates
 * from the top of every page and fades into the base navy. Render as the
 * first child of a screen root (absolute, non-interactive).
 */
export function ScreenGlow() {
  return (
    <View className="absolute inset-x-0 top-0 h-72" pointerEvents="none">
      <Svg
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        width="100%"
      >
        <Defs>
          <LinearGradient id="screen-glow" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.14" />
            <Stop offset="45%" stopColor={colors.accent} stopOpacity="0.05" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#screen-glow)" height="100" width="100" x="0" y="0" />
      </Svg>
    </View>
  );
}
