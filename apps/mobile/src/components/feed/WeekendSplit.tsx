import { useWindowDimensions } from 'react-native';

import { colors } from '../../theme/tokens';
import { View } from '../../tw';

/**
 * Two rows of 8px, which is the smallest chequer that still reads as a
 * chequer: one row is a dashed rule, three is upholstery. Same as web's
 * `.gpp-weekend-split`.
 */
const CELL = 8;

/**
 * How far in from each wall the band takes to reach full strength. Matches the
 * 4rem the web mask uses, so the two platforms fade over the same distance.
 */
const FADE = 64;

/** Full strength in the middle, gone at both walls. */
function strengthAt(centre: number, width: number): number {
  const fromWall = Math.min(centre, width - centre);
  return Math.max(0, Math.min(1, fromWall / FADE));
}

/**
 * The break between two race weekends in the activity stream.
 *
 * The port of web's `WeekendSplit`, and it has to be drawn rather than styled:
 * there is no repeating background here, so the squares are real views. Two
 * steps of the same grey ramp the cards are built from, never black and white,
 * which at this size vibrates and pulls the eye off the results either side of
 * it.
 *
 * No label. The card underneath already flies the flag and names the race.
 */
export function WeekendSplit({ className }: { className?: string }) {
  const { width } = useWindowDimensions();
  const columns = Math.ceil(width / CELL);
  // The run is pushed left by its own overhang, so it ends on a whole square at
  // the right wall and the clipped one is off the left edge instead. A half
  // square against a wall reads as a clipping bug.
  const offset = width - columns * CELL;

  return (
    <View
      accessibilityElementsHidden
      className={className}
      importantForAccessibility="no-hide-descendants"
      style={{ height: CELL * 2, overflow: 'hidden' }}
    >
      {[0, 1].map((row) => (
        <View className="flex-row" key={row} style={{ marginLeft: offset }}>
          {Array.from({ length: columns }, (_, column) => (
            <View
              key={column}
              style={{
                width: CELL,
                height: CELL,
                opacity: strengthAt(offset + column * CELL + CELL / 2, width),
                backgroundColor:
                  (row + column) % 2 === 0
                    ? colors.borderStrong
                    : colors.surfaceElevated,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
