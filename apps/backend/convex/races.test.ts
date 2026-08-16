import { describe, expect, it } from 'vitest';

import {
  findNextPredictionRace,
  findQuickPickRace,
  getPredictionOpenAtFromRaces,
} from './races';

describe('findNextPredictionRace', () => {
  it('keeps the current weekend open until its final prediction lock', () => {
    const now = 1_000;
    const currentWeekend = {
      _id: 'r1',
      season: 2026,
      round: 1,
      status: 'locked',
      predictionLockAt: now + 60_000,
    };
    const nextWeekend = {
      _id: 'r2',
      season: 2026,
      round: 2,
      status: 'upcoming',
      predictionLockAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    expect(findNextPredictionRace([nextWeekend, currentWeekend], now)).toEqual(
      currentWeekend,
    );
  });

  it('opens the next upcoming race as soon as the previous weekend final lock passes', () => {
    const now = 1_000;
    const lockedWeekend = {
      _id: 'r1',
      season: 2026,
      round: 1,
      status: 'locked',
      predictionLockAt: now - 1,
    };
    const nextWeekend = {
      _id: 'r2',
      season: 2026,
      round: 2,
      status: 'upcoming',
      predictionLockAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    expect(findNextPredictionRace([lockedWeekend, nextWeekend], now)).toEqual(
      nextWeekend,
    );
  });
});

describe('findQuickPickRace', () => {
  it('keeps showing the current weekend between locked sessions', () => {
    const now = 1_000;
    const currentRace = {
      _id: 'r1',
      season: 2026,
      round: 1,
      status: 'locked',
      predictionLockAt: now + 60_000,
    };
    const nextRace = {
      _id: 'r2',
      season: 2026,
      round: 2,
      status: 'upcoming',
      predictionLockAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    expect(findQuickPickRace([nextRace, currentRace], now)).toEqual(
      currentRace,
    );
  });

  it('keeps showing the current race after picks lock', () => {
    const now = 1_000;
    const currentRace = {
      _id: 'r1',
      season: 2026,
      round: 1,
      status: 'locked',
      predictionLockAt: now - 60_000,
    };
    const nextRace = {
      _id: 'r2',
      season: 2026,
      round: 2,
      status: 'upcoming',
      predictionLockAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    expect(findQuickPickRace([nextRace, currentRace], now)).toEqual(
      currentRace,
    );
  });

  it('advances after the current race results are published', () => {
    const now = 1_000;
    const finishedRace = {
      _id: 'r1',
      season: 2026,
      round: 1,
      status: 'finished',
      predictionLockAt: now - 60_000,
    };
    const nextRace = {
      _id: 'r2',
      season: 2026,
      round: 2,
      status: 'upcoming',
      predictionLockAt: now + 7 * 24 * 60 * 60 * 1000,
    };

    expect(findQuickPickRace([finishedRace, nextRace], now)).toEqual(nextRace);
  });

  it('uses the most recently locked race when results are pending', () => {
    const now = 1_000;
    const olderLockedRace = {
      _id: 'r1',
      season: 2026,
      round: 1,
      status: 'locked',
      predictionLockAt: now - 120_000,
    };
    const currentRace = {
      _id: 'r2',
      season: 2026,
      round: 2,
      status: 'locked',
      predictionLockAt: now - 60_000,
    };

    expect(findQuickPickRace([currentRace, olderLockedRace], now)).toEqual(
      currentRace,
    );
  });

  it('moves on once a locked race is stale enough to be stuck, not live', () => {
    // A race whose result never published stays 'locked' forever, because
    // only publishing the race session clears it. Without a bound, that race
    // pins the picks surface for good while the rest of the app counts down
    // to the next round.
    const now = 100 * 24 * 60 * 60 * 1000;
    const strandedRace = {
      _id: 'r1',
      season: 2026,
      round: 3,
      status: 'locked',
      predictionLockAt: now - 73 * 60 * 60 * 1000,
    };
    const nextRace = {
      _id: 'r2',
      season: 2026,
      round: 14,
      status: 'upcoming',
      predictionLockAt: now + 5 * 24 * 60 * 60 * 1000,
    };

    expect(findQuickPickRace([strandedRace, nextRace], now)).toEqual(nextRace);
  });

  it('still prefers a locked race inside the reconciliation window', () => {
    // The mirror of the case above: results are pending but reconciliation is
    // still running, so the weekend is genuinely live and stays in front.
    const now = 100 * 24 * 60 * 60 * 1000;
    const justRacedRace = {
      _id: 'r1',
      season: 2026,
      round: 13,
      status: 'locked',
      predictionLockAt: now - 71 * 60 * 60 * 1000,
    };
    const nextRace = {
      _id: 'r2',
      season: 2026,
      round: 14,
      status: 'upcoming',
      predictionLockAt: now + 5 * 24 * 60 * 60 * 1000,
    };

    expect(findQuickPickRace([justRacedRace, nextRace], now)).toEqual(
      justRacedRace,
    );
  });

  it('falls back to nothing when the only race is a stranded locked one', () => {
    const now = 100 * 24 * 60 * 60 * 1000;
    const strandedRace = {
      _id: 'r1',
      season: 2026,
      round: 3,
      status: 'locked',
      predictionLockAt: now - 90 * 24 * 60 * 60 * 1000,
    };

    expect(findQuickPickRace([strandedRace], now)).toBeNull();
  });
});

describe('getPredictionOpenAtFromRaces', () => {
  it('uses the previous race final prediction lock time', () => {
    const races = [
      {
        _id: 'r1',
        season: 2026,
        round: 1,
        status: 'locked',
        predictionLockAt: 123_456,
      },
      {
        _id: 'r2',
        season: 2026,
        round: 2,
        status: 'upcoming',
        predictionLockAt: 234_567,
      },
    ];

    expect(getPredictionOpenAtFromRaces(races, races[1])).toBe(123_456);
  });
});
