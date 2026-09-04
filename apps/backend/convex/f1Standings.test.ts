import { describe, expect, test } from 'vitest';

import {
  type ChampionshipSessionResult,
  type ChampionshipSessionType,
  compareCountback,
  countbackNotes,
  emptyDriverTally,
  type DriverTally,
  pointsForPosition,
  RACE_POINTS,
  rankChampionship,
  rankConstructorStandings,
  remainingPoints,
  resultChangedAt,
  type SeasonResults,
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

describe('resultChangedAt', () => {
  const PUBLISHED = 1780857459945; // Monaco, 7 June
  const AMENDED = 1788525329790; // the correction, 4 September

  test('is the first publish while nothing has been rewritten', () => {
    expect(
      resultChangedAt({ publishedAt: PUBLISHED, updatedAt: PUBLISHED }),
    ).toBe(PUBLISHED);
  });

  /**
   * The bug this replaced: `publishedAt` is frozen at the first publish, so a
   * penalty or an OpenF1 reconciliation months later changed the championship
   * points without moving the standings page's "Last updated" line (or its
   * `dateModified`). Monaco was corrected on 4 September and the table went on
   * claiming it was last updated on 23 August.
   */
  test('moves to the amendment when a result is corrected later', () => {
    expect(
      resultChangedAt({ publishedAt: PUBLISHED, updatedAt: AMENDED }),
    ).toBe(AMENDED);
  });

  test('falls back to the publish time on a row with no updatedAt', () => {
    expect(resultChangedAt({ publishedAt: PUBLISHED })).toBe(PUBLISHED);
  });

  test('never goes backwards if updatedAt somehow predates the publish', () => {
    expect(
      resultChangedAt({ publishedAt: AMENDED, updatedAt: PUBLISHED }),
    ).toBe(AMENDED);
  });
});

describe('rankChampionship lastUpdated', () => {
  function rank(sessions: { round: number; changedAt: number }[]) {
    return rankChampionship(
      {
        sessions: sessions.map((session) => ({
          sessionType: 'race' as const,
          round: session.round,
          classification: ['ver'],
          changedAt: session.changedAt,
        })),
        drivers: [],
        stints: new Map(),
        driversById: new Map(),
      } as unknown as SeasonResults,
      {
        sessionTypes: ['race', 'sprint'],
        headlineSession: 'race',
        podiumDepth: 3,
      },
    );
  }

  test('reports the most recent change across the season', () => {
    expect(
      rank([
        { round: 1, changedAt: 100 },
        { round: 2, changedAt: 300 },
      ]).lastUpdated,
    ).toBe(300);
  });

  /**
   * An old round corrected today dates the whole table today, even though a
   * later round was published first. "Last updated" is about the standings, not
   * about the newest race.
   */
  test('an amended early round dates the table, not the latest round', () => {
    expect(
      rank([
        { round: 6, changedAt: 900 },
        { round: 12, changedAt: 300 },
      ]).lastUpdated,
    ).toBe(900);
  });

  test('is null before anything is published', () => {
    expect(rank([]).lastUpdated).toBeNull();
  });
});

/**
 * A season small enough to check by hand, built the way the real loader builds
 * one: a roster, round-scoped stints, a calendar with a sprint in it, and the
 * sessions that have been scored so far.
 */
function season({
  sessions,
  stints = {},
  rounds = 3,
  sprintRounds = [],
}: {
  sessions: {
    sessionType: ChampionshipSessionType;
    round: number;
    classification: string[];
  }[];
  stints?: Record<
    string,
    { team: string; fromRound: number; toRound?: number }[]
  >;
  rounds?: number;
  sprintRounds?: number[];
}): SeasonResults {
  const codes = [
    ...new Set(sessions.flatMap((session) => session.classification)),
  ].sort();
  const drivers = codes.map((code) => ({
    _id: code,
    code: code.toUpperCase(),
    displayName: code,
    team: stints[code]?.[0]?.team ?? 'Red Bull Racing',
  }));

  return {
    sessions: sessions.map((session) => ({ ...session, changedAt: 1 })),
    drivers,
    stints: new Map(
      Object.entries(stints).map(([driverId, rows]) => [
        driverId,
        rows.map((row) => ({ ...row, driverId })),
      ]),
    ),
    races: Array.from({ length: rounds }, (_, index) => ({
      round: index + 1,
      name: `Round ${index + 1} Grand Prix`,
      slug: `round-${index + 1}`,
      startAt: index + 1,
      hasSprint: sprintRounds.includes(index + 1),
    })),
    driversById: new Map(drivers.map((driver) => [driver._id, driver])),
  } as unknown as SeasonResults;
}

function rankReal(data: SeasonResults) {
  return rankChampionship(data, {
    sessionTypes: ['race', 'sprint'],
    headlineSession: 'race',
    podiumDepth: 3,
    includeHistory: true,
  });
}

/**
 * The mid-season move the page has to explain: Lawson at Racing Bulls for
 * rounds 1–2, at Red Bull from round 3.
 */
function moveSeason(): SeasonResults {
  return season({
    sessions: [
      { sessionType: 'race', round: 1, classification: ['law', 'ver', 'lin'] },
      { sessionType: 'race', round: 2, classification: ['ver', 'lin', 'law'] },
      {
        sessionType: 'sprint',
        round: 2,
        classification: ['lin', 'ver', 'law'],
      },
      { sessionType: 'race', round: 3, classification: ['law', 'lin', 'ver'] },
    ],
    sprintRounds: [2],
    stints: {
      law: [
        { team: 'Racing Bulls', fromRound: 1, toRound: 2 },
        { team: 'Red Bull Racing', fromRound: 3 },
      ],
      lin: [{ team: 'Racing Bulls', fromRound: 1 }],
      ver: [{ team: 'Red Bull Racing', fromRound: 1 }],
    },
  });
}

describe('drivers reconcile with constructors', () => {
  /**
   * The defect this guards: a driver's points and his team's only add up if
   * each round's points are credited to the seat he was in that weekend. Sum
   * the per-round history back up through each driver's stints and the two
   * tables have to agree exactly, mid-season move included.
   */
  test('every team total is its drivers points scored while at that team', () => {
    const table = rankReal(moveSeason());

    const rebuilt = new Map<string, number>();
    for (const driver of table.drivers) {
      for (const round of driver.pointsByRound) {
        const team =
          driver.teamHistory.find(
            (stint) =>
              round.round >= stint.fromRound &&
              (stint.toRound === null || round.round <= stint.toRound),
          )?.team ?? driver.team;
        if (!team) {
          continue;
        }
        rebuilt.set(team, (rebuilt.get(team) ?? 0) + round.points);
      }
    }

    for (const team of table.constructors) {
      expect([team.team, rebuilt.get(team.team)]).toEqual([
        team.team,
        team.points,
      ]);
    }
  });

  test('a driver keeps every point across the move', () => {
    const table = rankReal(moveSeason());
    const lawson = table.drivers.find((driver) => driver.code === 'LAW');
    // Two wins, a third place, and third in the sprint.
    expect(lawson?.points).toBe(25 + 15 + 6 + 25);
    expect(lawson?.pointsByRound.at(-1)?.cumulative).toBe(lawson?.points);
  });
});

describe('standings history', () => {
  function table() {
    return rankReal(moveSeason());
  }

  test('reports the position change since the previous round', () => {
    const lawson = table().drivers.find((driver) => driver.code === 'LAW');
    // Lawson is second after round 2 and wins round 3 to lead.
    expect(lawson?.previousPosition).toBe(2);
    expect(lawson?.position).toBe(1);
    expect(lawson?.positionChange).toBe(1);
  });

  test('has no change to report before a second round is scored', () => {
    const opening = rankReal(
      season({
        sessions: [
          { sessionType: 'race', round: 1, classification: ['ver', 'law'] },
        ],
      }),
    );
    expect(opening.drivers[0].previousPosition).toBeNull();
    expect(opening.drivers[0].positionChange).toBeNull();
  });

  test('ends each history on the position the table prints', () => {
    for (const driver of table().drivers) {
      expect(driver.pointsByRound.at(-1)?.position).toBe(driver.position);
    }
    for (const team of table().constructors) {
      expect(team.pointsByRound.at(-1)?.position).toBe(team.position);
    }
  });

  test('keeps a driver on zero in the table rather than dropping them', () => {
    const table = rankReal(
      season({
        sessions: [
          {
            sessionType: 'race',
            round: 1,
            classification: ['ver', 'law', 'lin'],
          },
        ],
      }),
    );
    // Everyone who has raced holds a position after every round.
    expect(
      table.drivers.every((driver) => driver.pointsByRound.length === 1),
    ).toBe(true);
  });
});

describe('history is opt-in', () => {
  /**
   * The race write-ups embed this table in their SSR payload to say who leads.
   * Sending them ~800 rows of round history nobody draws is pure page weight,
   * so the history only travels when a caller asks for it.
   */
  test('leaves the round history out unless it is asked for', () => {
    const table = rankChampionship(moveSeason(), {
      sessionTypes: ['race', 'sprint'],
      headlineSession: 'race',
      podiumDepth: 3,
    });
    expect(table.drivers.every((d) => d.pointsByRound.length === 0)).toBe(true);
    expect(table.constructors.every((c) => c.pointsByRound.length === 0)).toBe(
      true,
    );
  });

  test('still reports the position change, which is read off that history', () => {
    const table = rankChampionship(moveSeason(), {
      sessionTypes: ['race', 'sprint'],
      headlineSession: 'race',
      podiumDepth: 3,
    });
    expect(
      table.drivers.find((driver) => driver.code === 'LAW')?.positionChange,
    ).toBe(1);
  });
});

describe('per-round points', () => {
  test('splits a sprint weekend into the race and the sprint', () => {
    const round2 = rankReal(moveSeason())
      .drivers.find((driver) => driver.code === 'LIN')
      ?.pointsByRound.find((row) => row.round === 2);
    // Second in the race (18) and a sprint win (8) on the same weekend.
    expect(round2).toMatchObject({ points: 26, sprintPoints: 8 });
  });

  test('leaves a weekend with no sprint on zero', () => {
    const round1 = rankReal(moveSeason())
      .drivers.find((driver) => driver.code === 'LIN')
      ?.pointsByRound.find((row) => row.round === 1);
    expect(round1?.sprintPoints).toBe(0);
  });
});

describe('gaps', () => {
  const table = rankReal(moveSeason());

  test('measures the leader at zero and everyone else behind them', () => {
    expect(table.drivers[0].gapToLeader).toBe(0);
    expect(table.drivers[0].gapToAhead).toBeNull();
    expect(table.drivers[1].gapToLeader).toBe(
      table.drivers[0].points - table.drivers[1].points,
    );
    expect(table.drivers[1].gapToAhead).toBe(table.drivers[1].gapToLeader);
  });

  test('measures a team the same way', () => {
    expect(table.constructors[0].gapToLeader).toBe(0);
    expect(table.constructors.at(-1)?.gapToLeader).toBe(
      table.constructors[0].points - (table.constructors.at(-1)?.points ?? 0),
    );
  });
});

describe('countbackNotes', () => {
  test('names the finish that separated two drivers level on points', () => {
    // Both on 43: one has a win and a second, the other two seconds.
    const notes = countbackNotes([
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [1, 1],
        },
      },
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [0, 2],
        },
      },
    ]);
    expect(notes).toEqual([
      { finishPosition: 1, count: 1 },
      { finishPosition: 1, count: 0 },
    ]);
  });

  test('drops to the next finishing position when wins are level', () => {
    const notes = countbackNotes([
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [1, 2],
        },
      },
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [1, 1],
        },
      },
    ]);
    expect(notes).toEqual([
      { finishPosition: 2, count: 2 },
      { finishPosition: 2, count: 1 },
    ]);
  });

  test('says nothing about an entry nobody is level with', () => {
    const notes = countbackNotes([
      {
        stats: {
          ...emptyDriverTally(),
          points: 50,
          headlinePositionCounts: [2],
        },
      },
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [1],
        },
      },
    ]);
    expect(notes).toEqual([null, null]);
  });

  test('says nothing when the countback cannot separate them either', () => {
    const notes = countbackNotes([
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [1],
        },
      },
      {
        stats: {
          ...emptyDriverTally(),
          points: 43,
          headlinePositionCounts: [1],
        },
      },
    ]);
    expect(notes).toEqual([null, null]);
  });
});

describe('remainingPoints', () => {
  const races = [
    { round: 1, name: 'One', slug: 'one', startAt: 1, hasSprint: false },
    { round: 2, name: 'Two', slug: 'two', startAt: 2, hasSprint: true },
    { round: 3, name: 'Three', slug: 'three', startAt: 3, hasSprint: false },
  ];

  test('counts a win in every race and sprint still to come', () => {
    expect(remainingPoints(races, [], ['race', 'sprint'])).toBe(25 * 3 + 8);
  });

  test('drops a session once it has been scored', () => {
    expect(
      remainingPoints(
        races,
        [
          { round: 1, sessionType: 'race' },
          { round: 2, sessionType: 'sprint' },
        ],
        ['race', 'sprint'],
      ),
    ).toBe(25 * 2);
  });

  test('never counts a sprint on a weekend that has none', () => {
    expect(remainingPoints([races[0]], [], ['race', 'sprint'])).toBe(25);
  });
});

describe('season shape', () => {
  test('dates the table by the last round scored, not the last on the calendar', () => {
    const table = rankReal(moveSeason());
    expect(table.roundsScored).toBe(3);
    expect(table.roundsTotal).toBe(3);
    expect(table.lastRound?.round).toBe(3);
    expect(table.nextRound).toBeNull();
  });

  test('points to the next Grand Prix while the season is still running', () => {
    const table = rankReal(
      season({
        sessions: [
          { sessionType: 'race', round: 1, classification: ['ver', 'law'] },
        ],
        rounds: 4,
      }),
    );
    expect(table.lastRound?.round).toBe(1);
    expect(table.nextRound?.round).toBe(2);
    expect(table.pointsRemaining).toBe(25 * 3);
  });
});
