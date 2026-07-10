import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../theme/tokens';
import { View } from '../../tw';

/**
 * Header background — port of the web header's "grid sheen + accent rail" look.
 * Renders a solid surface base, a subtle teal sheen that fades down, and a
 * glowing teal gradient rail across the very top edge.
 */
export function HeaderBackground() {
  return (
    <View className="flex-1 bg-surface">
      <View className="absolute inset-0">
        <Svg
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          width="100%"
        >
          <Defs>
            <LinearGradient id="header-sheen" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.12" />
              <Stop offset="50%" stopColor={colors.accent} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect
            fill="url(#header-sheen)"
            height="100"
            width="100"
            x="0"
            y="0"
          />
        </Svg>
      </View>
      <View className="absolute inset-x-0 top-0 h-0.5">
        <Svg
          height={2}
          preserveAspectRatio="none"
          viewBox="0 0 1000 2"
          width="100%"
        >
          <Defs>
            <LinearGradient id="header-rail" x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0" />
              <Stop offset="18%" stopColor={colors.accent} stopOpacity="0.9" />
              <Stop
                offset="50%"
                stopColor={colors.accentHover}
                stopOpacity="1"
              />
              <Stop offset="82%" stopColor={colors.accent} stopOpacity="0.9" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#header-rail)" height="2" width="1000" x="0" y="0" />
        </Svg>
      </View>
    </View>
  );
}
