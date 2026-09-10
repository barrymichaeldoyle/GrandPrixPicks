import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

import { getRaceWriteup, listRaceWriteups } from '@/lib/raceWriteups';

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

/**
 * Where a deleted circuit page should 301.
 *
 * The circuit pages all used to go to `/races` because inverting race→circuit
 * needs a season, and a hand-kept table would rot. Write-ups now exist for
 * some venues, and those are the indexed page for that circuit. Pointing
 * `/circuits/madring` at the calendar asked Google to transfer Madrid queries
 * onto a list of every round.
 *
 * Derived from the write-up registry and the existing race→circuit map, so
 * adding a write-up is what retargets the redirect. Circuits nobody wrote up
 * still go to `/races`.
 */
export function circuitPageRedirectTarget(circuitSlug: string): string {
  for (const writeup of listRaceWriteups()) {
    const circuit = getCircuitForRace(writeup.raceSlug);
    if (circuit?.slug === circuitSlug) {
      return writeup.to;
    }
  }
  return '/races';
}
