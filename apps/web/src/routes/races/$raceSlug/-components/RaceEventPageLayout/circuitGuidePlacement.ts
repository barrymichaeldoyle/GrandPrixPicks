import type { Doc } from '@convex-generated/dataModel';

type CircuitGuidePlacementInput = {
  raceStatus: Doc<'races'>['status'];
  /** `status === 'upcoming' && isNextRace`. Not viewer-dependent. */
  isPredictable: boolean;
  hasPublishedResults: boolean;
  hasPredictions: boolean;
};

/**
 * Whether the circuit briefing should run *above* the picks flow rather than
 * below it.
 *
 * It should, and only should, on a future round: one that has not opened for
 * predictions, has nothing scored, and holds no picks. There the picks flow can
 * only say "check back later", and a page whose first screen is a placeholder is
 * what got the site turned down by AdSense as thin content. Everywhere else the
 * briefing stays last so it never displaces picks or results.
 *
 * Deliberately excluded:
 * - the open round, because `isPredictable` is true there. This is the case that
 *   matters most: signed-out visitors land on it to try the game, and hoisting
 *   ~250 words of prose above that CTA would bury the one thing the page is for.
 * - a finished or scored round, because the results table is the content.
 * - a cancelled round, whose notice is the whole story.
 */
export function shouldLeadWithCircuitGuide({
  raceStatus,
  isPredictable,
  hasPublishedResults,
  hasPredictions,
}: CircuitGuidePlacementInput): boolean {
  return (
    raceStatus === 'upcoming' &&
    !isPredictable &&
    !hasPublishedResults &&
    !hasPredictions
  );
}
