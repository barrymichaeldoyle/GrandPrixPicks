import { describe, expect, it } from 'vitest';

import type { Id } from '@convex-generated/dataModel';
import type {
  PickBreakdown,
  SessionCardData,
  WeekendCardData,
} from '@/components/RaceScoreCard/types';
import type { SessionType } from '@/lib/sessions';

import { deriveWeekendRecap } from './recap';

function driverId(n: number): Id<'drivers'> {
  return `driver_${n}` as Id<'drivers'>;
}

function session(
  breakdown: Array<{
    predicted: number;
    actual?: number;
    points: number;
    code: string;
  }> | null,
): SessionCardData {
  const picks =
    breakdown == null
      ? []
      : breakdown.map((b, i) => ({
          driverId: driverId(i),
          code: b.code,
          team: 'Ferrari',
        }));
  const pickBreakdown: PickBreakdown[] | null =
    breakdown == null
      ? null
      : breakdown.map((b, i) => ({
          driverId: driverId(i),
          predictedPosition: b.predicted,
          actualPosition: b.actual,
          points: b.points,
        }));
  return {
    picks,
    points:
      breakdown == null ? null : breakdown.reduce((s, b) => s + b.points, 0),
    breakdown: pickBreakdown,
    actualTop5: null,
    fullClassification: null,
    isHidden: false,
    isLocked: true,
    hasResults: breakdown != null,
  };
}

function cardData(
  overrides: Partial<WeekendCardData> & {
    sessions: WeekendCardData['sessions'];
  },
): WeekendCardData {
  return {
    raceId: 'race_1' as Id<'races'>,
    raceSlug: 'monaco-2026',
    raceName: 'Monaco Grand Prix',
    raceRound: 6,
    raceStatus: 'finished',
    raceDate: 0,
    hasSprint: false,
    totalPoints: 0,
    maxPoints: 0,
    scoredSessionCount: 0,
    ...overrides,
  };
}

const REGULAR: readonly SessionType[] = ['quali', 'race'];

describe('deriveWeekendRecap', () => {
  it('summarises a perfect race with the right tier, best call, and stats', () => {
    const recap = deriveWeekendRecap({
      cardData: cardData({
        totalPoints: 25,
        maxPoints: 25,
        scoredSessionCount: 1,
        raceRank: { position: 3, totalPlayers: 40 },
        sessions: {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: session([
            { predicted: 1, actual: 1, points: 5, code: 'LEC' },
            { predicted: 2, actual: 2, points: 5, code: 'NOR' },
            { predicted: 3, actual: 3, points: 5, code: 'VER' },
            { predicted: 4, actual: 4, points: 5, code: 'PIA' },
            { predicted: 5, actual: 5, points: 5, code: 'RUS' },
          ]),
        },
      }),
      weekendSessions: REGULAR,
      h2hScoresBySession: {},
    });

    expect(recap.totalPoints).toBe(25);
    expect(recap.maxPoints).toBe(25);
    expect(recap.tier).toBe('stellar');
    expect(recap.exactHits).toBe(5);
    expect(recap.closeHits).toBe(5);
    expect(recap.totalPicks).toBe(5);
    expect(recap.perfectSessions).toEqual(['Race']);
    expect(recap.rank).toEqual({ position: 3, totalPlayers: 40 });
    // Best call breaks ties toward the most ambitious (lowest predicted) slot.
    expect(recap.bestCall?.code).toBe('LEC');
    expect(recap.bestCall?.predictedPosition).toBe(1);
    expect(recap.bestCall?.points).toBe(5);
  });

  it('folds H2H scores into the total and the max', () => {
    const recap = deriveWeekendRecap({
      cardData: cardData({
        totalPoints: 8,
        maxPoints: 25,
        scoredSessionCount: 1,
        sessions: {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: session([
            { predicted: 1, actual: 1, points: 5, code: 'LEC' },
            { predicted: 2, actual: 4, points: 3, code: 'NOR' },
            { predicted: 3, actual: 9, points: 0, code: 'VER' },
            { predicted: 4, actual: 11, points: 0, code: 'PIA' },
            { predicted: 5, actual: 12, points: 0, code: 'RUS' },
          ]),
        },
      }),
      weekendSessions: REGULAR,
      h2hScoresBySession: {
        race: { correctPicks: 7, totalPicks: 11, points: 7 },
      },
    });

    expect(recap.top5Points).toBe(8);
    expect(recap.h2hPoints).toBe(7);
    expect(recap.totalPoints).toBe(15);
    expect(recap.maxPoints).toBe(25 + 11);
    expect(recap.h2hCorrect).toBe(7);
    expect(recap.h2hTotal).toBe(11);
    expect(recap.exactHits).toBe(1);
    expect(recap.closeHits).toBe(2);
    expect(recap.tier).toBe('onboard'); // 8/25 = 0.32 → onboard
  });

  it('reports a tough weekend with no best call when nothing scored', () => {
    const recap = deriveWeekendRecap({
      cardData: cardData({
        totalPoints: 0,
        maxPoints: 25,
        scoredSessionCount: 1,
        sessions: {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: session([
            { predicted: 1, actual: 9, points: 0, code: 'LEC' },
            { predicted: 2, actual: 10, points: 0, code: 'NOR' },
            { predicted: 3, actual: 11, points: 0, code: 'VER' },
            { predicted: 4, actual: 12, points: 0, code: 'PIA' },
            { predicted: 5, actual: 13, points: 0, code: 'RUS' },
          ]),
        },
      }),
      weekendSessions: REGULAR,
      h2hScoresBySession: {},
    });

    expect(recap.tier).toBe('tough');
    expect(recap.bestCall).toBeNull();
    expect(recap.exactHits).toBe(0);
    expect(recap.perfectSessions).toEqual([]);
  });
});
