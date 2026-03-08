import { describe, expect, it } from 'vitest';

import type { Doc, Id } from './_generated/dataModel';
import { summarizeH2HScore } from './results';

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
