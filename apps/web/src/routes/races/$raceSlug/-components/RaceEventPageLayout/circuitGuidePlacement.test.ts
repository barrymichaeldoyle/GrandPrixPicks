import { describe, expect, it } from 'vitest';

import { shouldLeadWithCircuitGuide } from './circuitGuidePlacement';

const futureRound = {
  raceStatus: 'upcoming',
  isPredictable: false,
  hasPublishedResults: false,
  hasPredictions: false,
} as const;

describe('shouldLeadWithCircuitGuide', () => {
  it('leads with the briefing on a future round', () => {
    expect(shouldLeadWithCircuitGuide(futureRound)).toBe(true);
  });

  it('never leads on the open round, so the picks CTA stays first', () => {
    // The regression this file exists for. `isPredictable` is
    // `status === 'upcoming' && isNextRace` and owes nothing to the viewer, so
    // a signed-out visitor on the open round must still get picks above the
    // briefing rather than 250 words of prose.
    expect(
      shouldLeadWithCircuitGuide({ ...futureRound, isPredictable: true }),
    ).toBe(false);
  });

  it('never leads once a session has been scored', () => {
    expect(
      shouldLeadWithCircuitGuide({
        ...futureRound,
        hasPublishedResults: true,
      }),
    ).toBe(false);
  });

  it('never leads on a round the viewer already has picks for', () => {
    expect(
      shouldLeadWithCircuitGuide({ ...futureRound, hasPredictions: true }),
    ).toBe(false);
  });

  it.each(['locked', 'finished', 'cancelled'] as const)(
    'never leads on a %s round',
    (raceStatus) => {
      expect(shouldLeadWithCircuitGuide({ ...futureRound, raceStatus })).toBe(
        false,
      );
    },
  );
});
