import type { Id } from '../../convex/_generated/dataModel';
import { describe, expect, it } from 'vitest';

import { computeFavoriteTop5Pick } from './favorites';

function driver(id: string): Id<'drivers'> {
  return id as Id<'drivers'>;
}

function pick(driverId: Id<'drivers'>) {
  return { driverId, code: String(driverId) };
}

describe('computeFavoriteTop5Pick', () => {
  it('returns null when no weekends are available', () => {
    expect(computeFavoriteTop5Pick([])).toBeNull();
  });

  it('aggregates points across sessions and weekends', () => {
    const result = computeFavoriteTop5Pick([
      {
        raceDate: 2_000,
        hasSprint: false,
        sessions: {
          quali: {
            picks: [
              pick(driver('ham')),
              pick(driver('lec')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
          race: {
            picks: [
              pick(driver('lec')),
              pick(driver('ham')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
        },
      },
      {
        raceDate: 1_000,
        hasSprint: true,
        sessions: {
          sprint_quali: {
            picks: [
              pick(driver('ham')),
              pick(driver('nor')),
              pick(driver('lec')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
          sprint: {
            picks: [
              pick(driver('ham')),
              pick(driver('lec')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
          quali: {
            picks: [pick(driver('ham')), pick(driver('lec'))],
          },
          race: {
            picks: [
              pick(driver('lec')),
              pick(driver('ham')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
        },
      },
    ]);

    expect(result).toEqual({ driverId: driver('ham'), favoritePoints: 28 });
  });

  it('breaks total-point ties by higher count at better positions', () => {
    const result = computeFavoriteTop5Pick([
      {
        raceDate: 1_000,
        hasSprint: false,
        sessions: {
          quali: {
            picks: [
              pick(driver('ham')),
              pick(driver('lec')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
          race: {
            picks: [
              pick(driver('lec')),
              pick(driver('ham')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
        },
      },
    ]);

    expect(result).toEqual({ driverId: driver('lec'), favoritePoints: 9 });
  });

  it('uses most recent pick at a position as a later tie-breaker', () => {
    const result = computeFavoriteTop5Pick([
      {
        raceDate: 1_000,
        hasSprint: false,
        sessions: {
          quali: {
            picks: [
              pick(driver('ham')),
              pick(driver('lec')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
          race: {
            picks: [
              pick(driver('lec')),
              pick(driver('ham')),
              pick(driver('nor')),
              pick(driver('rus')),
              pick(driver('sai')),
            ],
          },
        },
      },
      {
        raceDate: 2_000,
        hasSprint: false,
        sessions: {
          quali: {
            picks: [],
          },
          race: {
            picks: [],
          },
        },
      },
    ]);

    expect(result).toEqual({ driverId: driver('lec'), favoritePoints: 9 });
  });
});
