/**
 * Free Practice presentation rules, shared by web and mobile.
 *
 * These two pieces were web-only, living next to web's Convex types in
 * `apps/web/src/lib/practiceSessions.ts` and `PracticeResultsCard.tsx`. Mobile
 * had grown its own `timing()` helper that formatted the same number the same
 * way, and its own `sessionType.toUpperCase()` for the label, which is how the
 * feed ended up saying "FP1" where web said "Free Practice 1".
 *
 * That is the shape the team-colour list was in before it moved here: two
 * copies that happened to agree, with nothing keeping them that way. A
 * classification is the same classification on both platforms, so the rule for
 * naming a session and for picking its one number lives in one file.
 *
 * Deliberately free of Convex types. Both apps generate their own `api`, so
 * the entry shape is declared structurally and each caller passes its own row.
 */

/** The session named in full. Never an abbreviation: the feed has the room. */
export const PRACTICE_SESSION_LABELS = {
  fp1: 'Free Practice 1',
  fp2: 'Free Practice 2',
  fp3: 'Free Practice 3',
} as const;

export type PracticeSessionLabelKey = keyof typeof PRACTICE_SESSION_LABELS;

/** An em dash, for a figure that has not arrived rather than one that is zero. */
const NO_VALUE = '—';

/** `1:29.412` — a lap time, minutes and three decimals, zero-padded seconds. */
export function formatPracticeLap(seconds?: number): string {
  if (seconds === undefined) {
    return NO_VALUE;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}

/**
 * Leader's lap, or the gap behind them. The one number a compact row shows.
 *
 * P1 is the only row that gets an absolute time: everyone else is read against
 * it, so a column of `+0.214` compares at a glance where a column of full lap
 * times does not.
 */
export function practiceGapOrLap(entry: {
  position: number;
  bestLapSeconds?: number;
  gapToLeaderSeconds?: number;
}): string {
  if (entry.position === 1) {
    return formatPracticeLap(entry.bestLapSeconds);
  }
  return entry.gapToLeaderSeconds === undefined
    ? NO_VALUE
    : `+${entry.gapToLeaderSeconds.toFixed(3)}`;
}
