/** Compact tab chrome height. Keep this in lockstep with `TabChrome`. */
export const TAB_CHROME_HEIGHT = 44;

/** Below this offset the chrome is always shown (top of list, or overscroll). */
const SHOW_AT_TOP_Y = 8;

/**
 * How far the chrome has been pulled off-screen, given a scroll delta.
 *
 * `current` and the return value are in px, 0 = fully shown,
 * `height` = fully hidden. Negative `y` (pull-to-refresh) is treated as 0 so
 * a bounce back does not slam the chrome shut.
 */
export function nextHideOffset({
  y,
  dy,
  current,
  height = TAB_CHROME_HEIGHT,
}: {
  y: number;
  dy: number;
  current: number;
  height?: number;
}): number {
  if (y <= SHOW_AT_TOP_Y) {
    return 0;
  }
  return Math.min(height, Math.max(0, current + dy));
}

/** Snap to shown or hidden when the finger lifts. */
export function snapHideOffset(
  current: number,
  height = TAB_CHROME_HEIGHT,
): number {
  return current > height / 2 ? height : 0;
}
