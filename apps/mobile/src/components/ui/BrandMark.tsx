import Svg, { G, Rect } from 'react-native-svg';

import { colors } from '../../theme/tokens';

/**
 * The three-bar brand mark, in the same geometry as apps/web/public/favicon.svg.
 *
 * It exists so there is one mark on mobile rather than a copy pasted into
 * whichever screen needed it. The sign-in screen used to draw its own: a
 * Lucide flag stroked in the retired teal, hardcoded, still there long after
 * the reskin removed that mark everywhere else. A shared component makes the
 * next rebrand a one-file change.
 *
 * Colours come from tokens, so the palette cannot drift from the web either.
 */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 32 32" width={size}>
      <Rect fill={colors.page} height={32} rx={6} width={32} x={0} y={0} />
      {/* Skewed about the centre, matching the favicon's transform. */}
      <G
        fill={colors.accent}
        transform="translate(16 16) skewX(-12) translate(-16 -16)"
      >
        <Rect height={12} width={6} x={5} y={13} />
        <Rect height={18} width={6} x={14} y={7} />
        <Rect height={9} width={6} x={23} y={16} />
      </G>
    </Svg>
  );
}
