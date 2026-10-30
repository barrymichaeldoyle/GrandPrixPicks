/**
 * Window size classes for iPad, the iPhone Duo's inner display and Android
 * tablets and foldables.
 *
 * Measured from the window, never the device or the orientation: an iPad app
 * runs in Split View and Stage Manager windows of any width, and the Duo's
 * inner display ignores the orientations an app declares. The same device can
 * be all three classes in one session.
 *
 * The thresholds are Material's window size classes. 600 is where a phone
 * layout stops filling the glass well; 840 is where two columns each keep a
 * usable width. Between them (the Duo's inner display upright, iPad mini and
 * 11-inch iPads in portrait, half of a Split View) one column is still right,
 * just not stretched to the edges.
 */
export type LayoutClass = 'compact' | 'medium' | 'expanded';

const MEDIUM_MIN_WIDTH = 600;
const EXPANDED_MIN_WIDTH = 840;

/**
 * The widest a single column of rows gets. Wider and a row's name and its
 * points sit so far apart the eye loses the line between them.
 */
export const READABLE_MAX_WIDTH = 640;

/** The supporting column beside the main one in the two-column layout. */
export const RAIL_WIDTH = 360;

export function layoutClassForWidth(width: number): LayoutClass {
  if (width >= EXPANDED_MIN_WIDTH) {
    return 'expanded';
  }
  if (width >= MEDIUM_MIN_WIDTH) {
    return 'medium';
  }
  return 'compact';
}

/**
 * Centres a scroll view's content in a column no wider than
 * `READABLE_MAX_WIDTH`. On a phone the window is narrower than the cap, so
 * this changes nothing there.
 *
 * Applied to the content container rather than the scroll view, so the
 * margins either side still scroll the list and its indicator stays at the
 * window edge.
 */
export const READABLE_COLUMN = {
  width: '100%',
  maxWidth: READABLE_MAX_WIDTH,
  alignSelf: 'center',
} as const;
