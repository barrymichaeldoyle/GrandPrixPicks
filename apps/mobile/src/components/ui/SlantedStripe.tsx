import Svg, { Polygon } from 'react-native-svg';

import { motif } from '@grandprixpicks/shared/tokens';
import { View } from '../../tw';
import { colors } from '../../theme/tokens';

const STRIPE_SPAN = motif.stripeWidth + motif.stripeLean;

/**
 * The signature stripe: a 3px bar with a 5px inner lean, pinned to the left
 * edge. Mirrors `.gpp-stripe` on web.
 *
 * Drawn as a clip, not `skewX`. A skew leans in proportion to height, so a
 * -12deg bar that looks right on a 44px row travels tens of pixels on a hero
 * and gets clipped to a nub. The lean is a fixed offset; the outer edge stays
 * flush top to bottom and the cant lives on the inner edge only.
 *
 * The polygon is drawn once on a 1-unit-tall viewBox and stretched to the
 * card with `preserveAspectRatio="none"`. Every offset is horizontal, so a
 * vertical stretch leaves the lean exactly as drawn. It used to measure the
 * card with `onLayout` and redraw at the new height, which cost every card
 * that grew (a news story opening) a frame with its stripe missing.
 *
 * `reverse` swaps which end is thick, the same job `.gpp-lean-run` does on
 * web: consecutive stacked cards meet thick-to-thick across the divider.
 */
export function SlantedStripe({
  color = colors.accent,
  reverse = false,
}: {
  color?: string;
  reverse?: boolean;
}) {
  const topInner = reverse ? motif.stripeWidth : STRIPE_SPAN;
  const bottomInner = reverse ? STRIPE_SPAN : motif.stripeWidth;

  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: STRIPE_SPAN,
      }}
    >
      <Svg
        height="100%"
        preserveAspectRatio="none"
        viewBox={`0 0 ${STRIPE_SPAN} 1`}
        width={STRIPE_SPAN}
      >
        <Polygon
          fill={color}
          points={`0,0 ${topInner},0 ${bottomInner},1 0,1`}
        />
      </Svg>
    </View>
  );
}
