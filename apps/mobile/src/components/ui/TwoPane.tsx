import type { ReactNode } from 'react';

import { RAIL_WIDTH, READABLE_MAX_WIDTH } from '../../lib/layout';
import { View } from '../../tw';

/**
 * Two columns for an expanded window: the screen's main column, a hairline,
 * then a fixed-width supporting column. Each pane brings its own scroll view,
 * so the shorter one stays put while the longer one scrolls, the way the web
 * dashboard's rails pin beside its centre column.
 *
 * The main column is capped at `READABLE_MAX_WIDTH` and the pair is centred,
 * so a 13-inch iPad in landscape gets margins rather than rows a foot long.
 * Render it only for the `expanded` size class; below that the screen's one
 * column is the layout.
 */
export function TwoPane({
  main,
  side,
  sideWidth = RAIL_WIDTH,
}: {
  main: ReactNode;
  side: ReactNode;
  sideWidth?: number;
}) {
  return (
    <View className="flex-1 flex-row justify-center">
      <View style={{ flex: 1, maxWidth: READABLE_MAX_WIDTH }}>{main}</View>
      <View className="w-px bg-border" />
      <View style={{ width: sideWidth }}>{side}</View>
    </View>
  );
}
