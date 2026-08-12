import { describe, expect, it } from 'vitest';

import type { QueryCtx } from '../_generated/server';
import { getCurrentSeason } from './season';

type FakeRace = { season: number };

/**
 * Stands in for the two index reads `getCurrentSeason` makes: the earliest
 * race that has not locked yet, and the most recent race by start time.
 */
function fakeCtx(rows: {
  nextUpcoming?: FakeRace | null;
  latest?: FakeRace | null;
}): Pick<QueryCtx, 'db'> {
  const db = {
    query: () => ({
      withIndex: (index: string) => {
        if (index === 'by_status_and_predictionLockAt') {
          return { first: async () => rows.nextUpcoming ?? null };
        }
        return {
          order: () => ({ first: async () => rows.latest ?? null }),
        };
      },
    }),
  };
  return { db } as unknown as Pick<QueryCtx, 'db'>;
}

describe('getCurrentSeason', () => {
  it('is the season of the next race that has not locked', async () => {
    const season = await getCurrentSeason(
      fakeCtx({ nextUpcoming: { season: 2026 }, latest: { season: 2027 } }),
    );

    // Mid-season, with next year's opener already on the calendar. The app
    // must stay in the season being played rather than jumping ahead the
    // moment 2027 rounds are seeded.
    expect(season).toBe(2026);
  });

  it('rolls over once the last race of a season has run', async () => {
    // The winter gap: nothing is upcoming, so the latest race decides. This is
    // the case that used to need someone to remember to edit a constant.
    const season = await getCurrentSeason(
      fakeCtx({ nextUpcoming: null, latest: { season: 2027 } }),
    );

    expect(season).toBe(2027);
  });

  it('keeps a finished season showing itself, not an empty next one', async () => {
    const season = await getCurrentSeason(
      fakeCtx({ nextUpcoming: null, latest: { season: 2026 } }),
    );

    expect(season).toBe(2026);
  });

  it('falls back only when there are no races at all', async () => {
    // Reachable on a fresh deployment before seeding, and nowhere else.
    const season = await getCurrentSeason(
      fakeCtx({ nextUpcoming: null, latest: null }),
    );

    expect(season).toBe(2026);
  });
});
