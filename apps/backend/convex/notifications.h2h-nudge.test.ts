import { describe, expect, it } from 'vitest';

import { getIncompleteH2HNudgeEligibility } from './notifications';

describe('getIncompleteH2HNudgeEligibility', () => {
  it('is eligible when Top 5 is complete and H2H is incomplete before lock', () => {
    const result = getIncompleteH2HNudgeEligibility({
      raceStatus: 'upcoming',
      predictionLockAt: Date.now() + 60_000,
      now: Date.now(),
      requiredSessions: ['quali', 'race'],
      top5Sessions: new Set(['quali', 'race']),
      h2hSessions: new Set(['quali']),
    });

    expect(result).toEqual({ eligible: true });
  });

  it('is not eligible when race is not upcoming', () => {
    const result = getIncompleteH2HNudgeEligibility({
      raceStatus: 'locked',
      predictionLockAt: Date.now() + 60_000,
      now: Date.now(),
      requiredSessions: ['quali', 'race'],
      top5Sessions: new Set(['quali', 'race']),
      h2hSessions: new Set(['quali']),
    });

    expect(result).toEqual({ eligible: false, reason: 'race_not_upcoming' });
  });

  it('is not eligible after prediction lock', () => {
    const now = Date.now();
    const result = getIncompleteH2HNudgeEligibility({
      raceStatus: 'upcoming',
      predictionLockAt: now - 1,
      now,
      requiredSessions: ['quali', 'race'],
      top5Sessions: new Set(['quali', 'race']),
      h2hSessions: new Set(['quali']),
    });

    expect(result).toEqual({ eligible: false, reason: 'predictions_locked' });
  });

  it('is not eligible when Top 5 is incomplete', () => {
    const result = getIncompleteH2HNudgeEligibility({
      raceStatus: 'upcoming',
      predictionLockAt: Date.now() + 60_000,
      now: Date.now(),
      requiredSessions: ['quali', 'race'],
      top5Sessions: new Set(['race']),
      h2hSessions: new Set(),
    });

    expect(result).toEqual({ eligible: false, reason: 'top5_incomplete' });
  });

  it('is not eligible when H2H is already complete', () => {
    const result = getIncompleteH2HNudgeEligibility({
      raceStatus: 'upcoming',
      predictionLockAt: Date.now() + 60_000,
      now: Date.now(),
      requiredSessions: ['quali', 'race'],
      top5Sessions: new Set(['quali', 'race']),
      h2hSessions: new Set(['quali', 'race']),
    });

    expect(result).toEqual({ eligible: false, reason: 'h2h_complete' });
  });
});
