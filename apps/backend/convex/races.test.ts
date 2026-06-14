import { describe, expect, it } from 'vitest';

import {
  findNextPredictionRace,
  findQuickPickRace,
  findRaceBySlugOrLegacyRef,
  getPredictionOpenAtFromRaces,
} from './races';

describe('findRaceBySlugOrLegacyRef', () => {
  const races = [
    { _id: 'j57abc', slug: 'australia-2026' },
    { _id: 'j57def', slug: 'china-2026' },
  ];

  it('matches a canonical slug', () => {
    expect(findRaceBySlugOrLegacyRef(races, 'china-2026')).toEqual(races[1]);
  });

  it('matches a legacy race document id', () => {
    expect(findRaceBySlugOrLegacyRef(races, 'j57def')).toEqual(races[1]);
  });

  it('returns null when no race matches', () => {
    expect(findRaceBySlugOrLegacyRef(races, 'missing-race')).toBeNull();
  });
});

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
