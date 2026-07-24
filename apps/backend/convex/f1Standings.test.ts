import { describe, expect, test } from 'vitest';

import {
  pointsForPosition,
  RACE_POINTS,
  SPRINT_POINTS,
  tallyDriverPoints,
} from './f1Standings';

describe('pointsForPosition', () => {
  test('awards the full race points table for the top 10', () => {
    expect(pointsForPosition(1, RACE_POINTS)).toBe(25);
    expect(pointsForPosition(2, RACE_POINTS)).toBe(18);
    expect(pointsForPosition(10, RACE_POINTS)).toBe(1);
  });

  test('scores nothing outside the points table', () => {
    expect(pointsForPosition(11, RACE_POINTS)).toBe(0);
    expect(pointsForPosition(0, RACE_POINTS)).toBe(0);
    expect(pointsForPosition(9, SPRINT_POINTS)).toBe(0);
    expect(pointsForPosition(8, SPRINT_POINTS)).toBe(1);
  });
});

describe('tallyDriverPoints', () => {
  test('sums race and sprint points across sessions', () => {
    const tally = tallyDriverPoints([
      // Round 1 race: ver P1, nor P2, lec P3
      { sessionType: 'race', classification: ['ver', 'nor', 'lec'] },
      // Sprint: nor P1 (8), ver P2 (7)
      { sessionType: 'sprint', classification: ['nor', 'ver'] },
    ]);

    expect(tally.get('ver')).toEqual({ points: 25 + 7, wins: 1, podiums: 1 });
    expect(tally.get('nor')).toEqual({ points: 18 + 8, wins: 0, podiums: 1 });
    expect(tally.get('lec')).toEqual({ points: 15, wins: 0, podiums: 1 });
  });

  test('counts wins and podiums from main races only, not sprints', () => {
    const tally = tallyDriverPoints([
      { sessionType: 'sprint', classification: ['ham'] },
      { sessionType: 'race', classification: ['ham'] },
    ]);

    // 8 (sprint P1) + 25 (race P1); one win + one podium from the race only.
    expect(tally.get('ham')).toEqual({ points: 33, wins: 1, podiums: 1 });
  });

  test('drivers outside the points positions score zero but still appear', () => {
    const classification = Array.from({ length: 15 }, (_, i) => `d${i + 1}`);
    const tally = tallyDriverPoints([{ sessionType: 'race', classification }]);

    expect(tally.get('d11')).toEqual({ points: 0, wins: 0, podiums: 0 });
    expect(tally.get('d15')).toEqual({ points: 0, wins: 0, podiums: 0 });
  });

  test('returns an empty tally when there are no sessions', () => {
    expect(tallyDriverPoints([]).size).toBe(0);
  });
});
