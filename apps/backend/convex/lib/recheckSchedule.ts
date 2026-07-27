const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Gaps between automatic reconciliations of a published result against the
 * official classification, each measured from the previous pass. We publish the
 * provisional result promptly so players see their points, then reconcile:
 * most stewards' decisions and post-session scrutineering land within a few
 * hours, and the long tail (appeals, right of review) is covered by the last
 * pass. `stage` is the index of the pass that is about to be scheduled.
 */
export const RECHECK_GAPS = [3 * HOUR, 9 * HOUR, 60 * HOUR] as const;

/** When the pass at `stage` should run, or undefined once all passes are used. */
export function nextRecheckAt(stage: number, from: number): number | undefined {
  const gap = RECHECK_GAPS[stage];
  return gap === undefined ? undefined : from + gap;
}
