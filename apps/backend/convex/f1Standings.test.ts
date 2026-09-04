import { describe, expect, test } from 'vitest';

import {
  type ChampionshipSessionResult,
  compareCountback,
  type DriverTally,
  pointsForPosition,
  RACE_POINTS,
  rankConstructorStandings,
  SPRINT_POINTS,
  tallyBy,
  tallyDriverPoints,
} from './f1Standings';

/** A tally carrying only the finishing positions the countback cares about. */
function tallyWithFinishes(...positions: number[]): DriverTally {
  const headlinePositionCounts: number[] = [];
  for (const position of positions) {
    headlinePositionCounts[position - 1] =
      (headlinePositionCounts[position - 1] ?? 0) + 1;
  }
  return { points: 0, wins: 0, podiums: 0, headlinePositionCounts };
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
      { sessionType: 'race', round: 1, classification: ['ver', 'nor', 'lec'] },
      // Sprint: nor P1 (8), ver P2 (7)
      { sessionType: 'sprint', round: 1, classification: ['nor', 'ver'] },
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
      { sessionType: 'sprint', round: 1, classification: ['ham'] },
      { sessionType: 'race', round: 1, classification: ['ham'] },
    ]);

    // 8 (sprint P1) + 25 (race P1); one win + one podium from the race only.
    expect(tally.get('ham')).toMatchObject({ points: 33, wins: 1, podiums: 1 });
  });

  test('drivers outside the points positions score zero but still appear', () => {
    const classification = Array.from({ length: 15 }, (_, i) => `d${i + 1}`);
    const tally = tallyDriverPoints([
      { sessionType: 'race', round: 1, classification },
    ]);

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
        round: 1,
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
        round: 1,
        classification: ['ver', 'nor', 'lec'],
        dnfDriverIds: ['nor'],
      },
    ]);

    expect(tally.get('ver')).toMatchObject({ points: 25, wins: 1, podiums: 1 });
    expect(tally.get('lec')).toMatchObject({ points: 18, wins: 0, podiums: 1 });
  });

  test('records main-race finishing positions for the tie-break', () => {
    const tally = tallyDriverPoints([
      { sessionType: 'race', round: 1, classification: ['ver', 'nor'] },
      { sessionType: 'race', round: 1, classification: ['nor', 'ver'] },
      // Sprints never feed the countback.
      { sessionType: 'sprint', round: 1, classification: ['ver', 'nor'] },
    ]);

    // One P1 and one P2 apiece from the two races.
    expect(tally.get('ver')?.headlinePositionCounts).toEqual([1, 1]);
    expect(tally.get('nor')?.headlinePositionCounts).toEqual([1, 1]);
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

describe('rankConstructorStandings', () => {
  test('ranks teams by combined driver points', () => {
    const standings = rankConstructorStandings([
      {
        team: 'mercedes',
        stats: { ...tallyWithFinishes(1), points: 80 },
      },
      {
        team: 'mercedes',
        stats: { ...tallyWithFinishes(2), points: 60 },
      },
      {
        team: 'ferrari',
        stats: { ...tallyWithFinishes(1), points: 70 },
      },
      {
        team: 'ferrari',
        stats: { ...tallyWithFinishes(3), points: 50 },
      },
    ]);

    expect(standings.map(({ team, points }) => ({ team, points }))).toEqual([
      { team: 'mercedes', points: 140 },
      { team: 'ferrari', points: 120 },
    ]);
  });

  test('uses pooled race countback when teams are tied on points', () => {
    const standings = rankConstructorStandings([
      {
        team: 'mercedes',
        stats: { ...tallyWithFinishes(1, 4), points: 100 },
      },
      {
        team: 'ferrari',
        stats: { ...tallyWithFinishes(2, 2), points: 100 },
      },
    ]);

    expect(standings.map((standing) => standing.team)).toEqual([
      'mercedes',
      'ferrari',
    ]);
  });
});

describe('constructor points across a mid-season driver move', () => {
  // Lawson drove for Racing Bulls through round 11, then replaced the injured
  // Hadjar at Red Bull from round 12. Points follow the car he was in at the
  // time: pooling by his current team would hand Red Bull the whole lot.
  function teamAtRound(driverId: string, round: number): string | null {
    if (driverId === 'law') {
      return round <= 11 ? 'Racing Bulls' : 'Red Bull Racing';
    }
    if (driverId === 'lin') {
      return 'Racing Bulls';
    }
    if (driverId === 'ver') {
      return 'Red Bull Racing';
    }
    return null;
  }

  const sessions: ChampionshipSessionResult[] = [
    // Round 11: Lawson wins for Racing Bulls, Verstappen second.
    { sessionType: 'race', round: 11, classification: ['law', 'ver', 'lin'] },
    // Round 12: same finishing order, but Lawson is in the Red Bull now.
    { sessionType: 'race', round: 12, classification: ['law', 'ver', 'lin'] },
  ];

  test('leaves points earned before the move with the old team', () => {
    const tally = tallyBy(sessions, (driverId, session) =>
      teamAtRound(driverId, session.round),
    );
    // Round 11 only: Lawson's 25 plus Lindblad's 15.
    // Round 12: Lindblad's 15 alone.
    expect(tally.get('Racing Bulls')?.points).toBe(25 + 15 + 15);
  });

  test('credits the new team only from the round the driver joined it', () => {
    const tally = tallyBy(sessions, (driverId, session) =>
      teamAtRound(driverId, session.round),
    );
    // Verstappen's 18 twice, plus Lawson's round-12 win only.
    expect(tally.get('Red Bull Racing')?.points).toBe(18 + 18 + 25);
  });

  test('still gives the driver every point he scored, either side of the move', () => {
    // The drivers' championship is unaffected by which car he was in.
    const tally = tallyDriverPoints(sessions);
    expect(tally.get('law')?.points).toBe(50);
    expect(tally.get('law')?.wins).toBe(2);
  });

  test('does not promote the rest of the field when a driver has no team', () => {
    // An unattributed driver still occupies his finishing position, exactly as
    // a retirement does, so nobody behind him is promoted into his points.
    const tally = tallyBy(sessions, (driverId, session) =>
      driverId === 'law' ? null : teamAtRound(driverId, session.round),
    );
    expect(tally.get('Red Bull Racing')?.points).toBe(18 + 18);
    expect(tally.has('law')).toBe(false);
  });
});
