import { describe, expect, it } from 'vitest';

import {
  calendarRaces,
  isRaceAcceptingPredictions,
  isSyntheticRaceSlug,
} from './calendarRaces';

describe('isSyntheticRaceSlug', () => {
  it('treats leftover e2e and social fixtures as synthetic', () => {
    expect(
      isSyntheticRaceSlug(
        'scenario-race-upcoming-signed-in-complete-h2h-edit-race',
      ),
    ).toBe(true);
    expect(isSyntheticRaceSlug('social-race-feed-preview')).toBe(true);
  });

  it('leaves the real calendar alone', () => {
    expect(isSyntheticRaceSlug('madrid-2026')).toBe(false);
  });
});

describe('calendarRaces', () => {
  it('drops fixtures so the next real GP stays first', () => {
    const races = calendarRaces([
      { slug: 'scenario-race-upcoming-signed-in-complete-h2h-edit-race' },
      { slug: 'madrid-2026' },
      { slug: 'azerbaijan-2026' },
    ]);

    expect(races.map((race) => race.slug)).toEqual([
      'madrid-2026',
      'azerbaijan-2026',
    ]);
  });
});

describe('isRaceAcceptingPredictions', () => {
  const now = 1_000;
  const madrid = {
    _id: 'madrid' as never,
    slug: 'madrid-2026',
    status: 'upcoming' as const,
    predictionLockAt: now + 60_000,
  };
  const fixture = {
    _id: 'fixture' as never,
    slug: 'scenario-race-upcoming-signed-in-complete-h2h-edit-race',
    status: 'upcoming' as const,
    predictionLockAt: now + 1_000,
  };

  it('accepts the next real calendar race', () => {
    expect(isRaceAcceptingPredictions(madrid, madrid, now)).toBe(true);
  });

  it('accepts a scenario fixture opened on purpose', () => {
    expect(isRaceAcceptingPredictions(fixture, madrid, now)).toBe(true);
  });

  it('rejects a later real GP', () => {
    expect(
      isRaceAcceptingPredictions(
        { ...madrid, _id: 'baku' as never, slug: 'azerbaijan-2026' },
        madrid,
        now,
      ),
    ).toBe(false);
  });
});
