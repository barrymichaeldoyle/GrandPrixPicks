import { describe, expect, it } from 'vitest';

import type { Doc, Id } from './_generated/dataModel';
import {
  pushUniqueBatchItem,
  shouldSuppressResultNotifications,
  summarizeH2HScore,
} from './results';

function driver(id: string): Id<'drivers'> {
  return id as Id<'drivers'>;
}

function matchup(id: string): Id<'h2hMatchups'> {
  return id as Id<'h2hMatchups'>;
}

function prediction(
  matchupId: Id<'h2hMatchups'>,
  predictedWinnerId: Id<'drivers'>,
): Pick<Doc<'h2hPredictions'>, 'matchupId' | 'predictedWinnerId'> {
  return { matchupId, predictedWinnerId };
}

describe('summarizeH2HScore', () => {
  it('counts all correct picks across the full session set', () => {
    const results = new Map<string, Id<'drivers'>>([
      [matchup('m1').toString(), driver('d1')],
      [matchup('m2').toString(), driver('d4')],
      [matchup('m3').toString(), driver('d5')],
      [matchup('m4').toString(), driver('d7')],
    ]);

    const summary = summarizeH2HScore(
      [
        prediction(matchup('m1'), driver('d1')),
        prediction(matchup('m2'), driver('d3')),
        prediction(matchup('m3'), driver('d5')),
        prediction(matchup('m4'), driver('d7')),
      ],
      results,
    );

    expect(summary).toEqual({
      correctPicks: 3,
      totalPicks: 4,
      points: 3,
    });
  });
});

describe('pushUniqueBatchItem', () => {
  it('dedupes users before completing batches', () => {
    const state = {
      seen: new Set<Id<'users'>>(),
      batch: [] as Array<Id<'users'>>,
    };

    const u1 = 'user_1' as Id<'users'>;
    const u2 = 'user_2' as Id<'users'>;
    const u3 = 'user_3' as Id<'users'>;

    expect(pushUniqueBatchItem(state, u1, 2)).toBeNull();
    expect(pushUniqueBatchItem(state, u1, 2)).toBeNull();
    expect(pushUniqueBatchItem(state, u2, 2)).toEqual([u1, u2]);
    expect(pushUniqueBatchItem(state, u2, 2)).toBeNull();
    expect(pushUniqueBatchItem(state, u3, 2)).toBeNull();
    expect(state.batch).toEqual([u3]);
  });
});

describe('summarizeH2HScore voided matchups', () => {
  it('drops a matchup with no result from the total', () => {
    // Both drivers in m2 failed to start, so no result was published for it.
    const results = new Map<string, Id<'drivers'>>([
      [matchup('m1').toString(), driver('d1')],
      [matchup('m3').toString(), driver('d5')],
    ]);

    const summary = summarizeH2HScore(
      [
        prediction(matchup('m1'), driver('d1')),
        prediction(matchup('m2'), driver('d3')),
        prediction(matchup('m3'), driver('d5')),
      ],
      results,
    );

    // 2/2 rather than an unwinnable 2/3.
    expect(summary).toEqual({
      correctPicks: 2,
      totalPicks: 2,
      points: 2,
    });
  });

  it('does not punish a pick on a matchup that was voided', () => {
    const results = new Map<string, Id<'drivers'>>([
      [matchup('m1').toString(), driver('d1')],
    ]);

    const summary = summarizeH2HScore(
      [
        prediction(matchup('m1'), driver('d2')),
        prediction(matchup('m2'), driver('d3')),
      ],
      results,
    );

    expect(summary).toEqual({
      correctPicks: 0,
      totalPicks: 1,
      points: 0,
    });
  });

  it('returns a zero total when every matchup is void', () => {
    const summary = summarizeH2HScore(
      [prediction(matchup('m1'), driver('d1'))],
      new Map(),
    );

    expect(summary).toEqual({ correctPicks: 0, totalPicks: 0, points: 0 });
  });
});

describe('shouldSuppressResultNotifications', () => {
  it('announces a session only on first publication', () => {
    expect(shouldSuppressResultNotifications({ isRepublish: false })).toBe(
      false,
    );
  });

  it('stays quiet on every republish', () => {
    // Corrections, reconciliations and amendments all land here. Sending the
    // "results are in" email again mails the whole user base a second time.
    expect(shouldSuppressResultNotifications({ isRepublish: true })).toBe(true);
  });

  it('stays quiet when the caller asks for silence on a first publish', () => {
    expect(
      shouldSuppressResultNotifications({
        requested: true,
        isRepublish: false,
      }),
    ).toBe(true);
  });
});
