import type { StyleProp, ViewStyle } from 'react-native';

import { getTeamColor } from '../../lib/teamColors';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';

/**
 * The team-coloured driver chip, matching web's `DriverBadge`.
 *
 * Team colour is confined to a 3px left bar, which is the rule the design
 * system states in `packages/shared/src/tokens.ts`: a team colour appears as a
 * 3px full-height bar on the edge of a driver row or chip, or a 5px dot before
 * a team name, and nowhere else. Filling the chip with the colour is what made
 * a grid of 22 drivers read as loud — eleven saturated fills competing at full
 * area — and it forces the code to sit on whatever the team happens to be
 * instead of on `text` at a proper contrast ratio.
 *
 * Web reaches the bar through the `.gpp-team-bar` `::before`. React Native has
 * no pseudo-elements, so it is an absolutely positioned sibling here. Same
 * 3px, same edge, same reason.
 *
 * `sunken` is the fill for a chip inside an already-raised row (the feed's
 * practice classification); `elevated` is the default standalone chip.
 */
export function DriverBadge({
  code,
  team,
  number,
  showNumber = false,
  size = 'sm',
  fill = 'elevated',
  style,
}: {
  code: string;
  team?: string | null;
  number?: number | null;
  showNumber?: boolean;
  size?: 'sm' | 'md';
  fill?: 'elevated' | 'sunken';
  style?: StyleProp<ViewStyle>;
}) {
  const { numeralFontFamily } = useTypography();

  return (
    <View
      className={`relative flex-row items-center justify-center overflow-hidden rounded-sm ${
        size === 'md' ? 'h-8 min-w-11 pr-2.5 pl-3' : 'h-6 min-w-9 pr-1.5 pl-2'
      } ${
        fill === 'sunken'
          ? 'bg-surface-sunken'
          : 'border border-border bg-surface-elevated'
      }`}
      style={style}
    >
      <View
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ backgroundColor: getTeamColor(team) }}
      />
      {showNumber && number != null ? (
        <Text
          className="text-foreground mr-1 text-xs"
          style={numeralFontFamily ? { fontFamily: numeralFontFamily } : null}
        >
          {number}
        </Text>
      ) : null}
      <Text
        className="text-foreground text-xs font-medium tracking-wide uppercase"
        style={numeralFontFamily ? { fontFamily: numeralFontFamily } : null}
      >
        {code}
      </Text>
    </View>
  );
}
