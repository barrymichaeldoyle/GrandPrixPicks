import { getRaceWriteup } from '@/lib/raceWriteups';

/**
 * Head metadata that hands a race page's search equity to its write-up.
 *
 * `/races/$slug` and `/f1-2026-*-grand-prix-predictions` answer the same query
 * for a weekend that has editorial copy, so only one of them should compete:
 * the write-up. The race page stays reachable and unchanged for players (it is
 * where the picks, results and duels live, and most of the app links to it),
 * it just stops asking to be indexed and points its canonical at the write-up.
 *
 * A redirect would consolidate the same signal, but it would also take the
 * game away: every race card, notification, feed row and score card links here.
 *
 * Returns null for the normal case, a weekend nobody wrote up.
 */
export function racePageWriteupHeadOptions(raceSlug: string): {
  canonicalPath: string;
  noIndex: true;
} | null {
  const writeup = getRaceWriteup(raceSlug);
  if (!writeup) {
    return null;
  }
  return { canonicalPath: writeup.to, noIndex: true };
}
