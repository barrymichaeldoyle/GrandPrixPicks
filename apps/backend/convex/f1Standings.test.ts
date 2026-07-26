import { describe, expect, test } from 'vitest';

import {
  compareCountback,
  type DriverTally,
  pointsForPosition,
  RACE_POINTS,
  SPRINT_POINTS,
  tallyDriverPoints,
} from './f1Standings';

/** A tally carrying only the finishing positions the countback cares about. */
function tallyWithFinishes(...positions: number[]): DriverTally {
  const racePositionCounts: number[] = [];
  for (const position of positions) {
    racePositionCounts[position - 1] =
      (racePositionCounts[position - 1] ?? 0) + 1;
  }
  return { points: 0, wins: 0, podiums: 0, racePositionCounts };
}

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

    expect(tally.get('ver')).toMatchObject({
      points: 25 + 7,
      wins: 1,
      podiums: 1,
    });
    expect(tally.get('nor')).toMatchObject({
      points: 18 + 8,
      wins: 0,
      podiums: 1,
    });
    expect(tally.get('lec')).toMatchObject({ points: 15, wins: 0, podiums: 1 });
  });

  test('counts wins and podiums from main races only, not sprints', () => {
    const tally = tallyDriverPoints([
      { sessionType: 'sprint', classification: ['ham'] },
      { sessionType: 'race', classification: ['ham'] },
    ]);

    // 8 (sprint P1) + 25 (race P1); one win + one podium from the race only.
    expect(tally.get('ham')).toMatchObject({ points: 33, wins: 1, podiums: 1 });
  });

  test('drivers outside the points positions score zero but still appear', () => {
    const classification = Array.from({ length: 15 }, (_, i) => `d${i + 1}`);
    const tally = tallyDriverPoints([{ sessionType: 'race', classification }]);

    expect(tally.get('d11')).toMatchObject({ points: 0, wins: 0, podiums: 0 });
    expect(tally.get('d15')).toMatchObject({ points: 0, wins: 0, podiums: 0 });
  });

  test('returns an empty tally when there are no sessions', () => {
    expect(tallyDriverPoints([]).size).toBe(0);
  });

  test('retired drivers score nothing but still appear', () => {
    const tally = tallyDriverPoints([
      {
        sessionType: 'race',
        classification: ['ver', 'nor', 'lec'],
        dnfDriverIds: ['nor'],
      },
    ]);

    expect(tally.get('nor')).toMatchObject({ points: 0, wins: 0, podiums: 0 });
    expect(tally.has('nor')).toBe(true);
  });

  test('a mid-classification retirement does not demote the drivers below it', () => {
    // `nor` retired but was entered second, so `lec` is the real P2.
    const tally = tallyDriverPoints([
      {
        sessionType: 'race',
        classification: ['ver', 'nor', 'lec'],
        dnfDriverIds: ['nor'],
      },
    ]);

    expect(tally.get('ver')).toMatchObject({ points: 25, wins: 1, podiums: 1 });
    expect(tally.get('lec')).toMatchObject({ points: 18, wins: 0, podiums: 1 });
  });

  test('records main-race finishing positions for the tie-break', () => {
    const tally = tallyDriverPoints([
      { sessionType: 'race', classification: ['ver', 'nor'] },
      { sessionType: 'race', classification: ['nor', 'ver'] },
      // Sprints never feed the countback.
      { sessionType: 'sprint', classification: ['ver', 'nor'] },
    ]);

    // One P1 and one P2 apiece from the two races.
    expect(tally.get('ver')?.racePositionCounts).toEqual([1, 1]);
    expect(tally.get('nor')?.racePositionCounts).toEqual([1, 1]);
  });
});

describe('compareCountback', () => {
  test('ranks the driver with more wins ahead', () => {
    const oneWin = tallyWithFinishes(1, 5, 5);
    const noWins = tallyWithFinishes(2, 2, 2);

    expect(compareCountback(oneWin, noWins)).toBeLessThan(0);
    expect(compareCountback(noWins, oneWin)).toBeGreaterThan(0);
  });

  test('falls through to later positions when earlier ones are level', () => {
    // Both have one win and one second; the third places decide it.
    const better = tallyWithFinishes(1, 2, 3);
    const worse = tallyWithFinishes(1, 2, 4);

    expect(compareCountback(better, worse)).toBeLessThan(0);
  });

  test('treats identical finishing records as tied', () => {
    expect(
      compareCountback(tallyWithFinishes(1, 4), tallyWithFinishes(4, 1)),
    ).toBe(0);
  });

  test('ranks any finishing record ahead of none at all', () => {
    expect(
      compareCountback(tallyWithFinishes(18), tallyWithFinishes()),
    ).toBeLessThan(0);
  });
});
