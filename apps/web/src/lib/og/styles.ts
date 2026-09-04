import { colors as tokens } from '@grandprixpicks/shared/tokens';

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** 16:9 aspect ratio (e.g. for TanStack Showcase, video thumbnails). */
const OG_WIDTH_16_9 = 1280;
const OG_HEIGHT_16_9 = 720;

export type OgImageSize = 'og' | '16:9';

export function getOgDimensions(size: OgImageSize): {
  width: number;
  height: number;
} {
  return size === '16:9'
    ? { width: OG_WIDTH_16_9, height: OG_HEIGHT_16_9 }
    : { width: OG_WIDTH, height: OG_HEIGHT };
}

/**
 * OG card palette, derived from the design tokens.
 *
 * Satori cannot resolve CSS custom properties, so these have to be literal hex
 * strings. That is the only reason this object exists: it is a renaming layer
 * over `@grandprixpicks/shared/tokens`, never a place to author a colour. An
 * earlier hand-copied version of this map drifted until 8 of its 9 colours no
 * longer matched the app, so share cards shipped in a palette the product had
 * abandoned. Add colours to tokens.ts and alias them here.
 */
export const colors = {
  bg: tokens.page,
  surface: tokens.surface,
  surfaceElevated: tokens.surfaceElevated,
  accent: tokens.accent,
  accentHover: tokens.accentHover,
  buttonAccent: tokens.buttonAccent,
  accentMuted: tokens.accentMuted,
  /** Text sitting ON the accent. Never white — the accent is a light colour. */
  textOnAccent: tokens.textOnAccent,
  text: tokens.text,
  textMuted: tokens.textMuted,
  border: tokens.border,
  borderStrong: tokens.borderStrong,
  gold: tokens.podiumGold,
  silver: tokens.podiumSilver,
  bronze: tokens.podiumBronze,
  // The four scoring semantics, so a results card reads the same as the app.
  resultExact: tokens.resultExact,
  resultNear: tokens.resultNear,
  resultTop5: tokens.resultTop5,
  resultMiss: tokens.resultMiss,
  // Position deltas, so the qualifying-championship card's movement column
  // reads in the same green/red the app's RankDelta uses.
  deltaUp: tokens.deltaUp,
  deltaDown: tokens.deltaDown,
  // Race status, using the same semantic tokens the app's status badges use.
  statusUpcoming: tokens.success,
  statusLocked: tokens.warning,
  /** Errors and non-finishes. Amber and instructive, never red. */
  warning: tokens.warning,
};
