import { describe, expect, it } from 'vitest';

import {
  TEAMMATE_PAIRINGS_2026,
  compareDriversByTeam,
  coversRound,
  currentPairings,
  driverStintsForSeason,
  pairingsForRound,
  roundsWithSeatMoves,
  seatMovesForRound,
  teamStandingsIndex,
} from './teams';

describe('teamStandingsIndex', () => {
  it('ranks teams by last season, not by name', () => {
    // Final 2025 constructors order. Alphabetical would put Alpine first and
    // McLaren seventh, which is the arbitrary ordering this exists to replace.
    expect(teamStandingsIndex('McLaren')).toBe(0);
    expect(teamStandingsIndex('Mercedes')).toBe(1);
    expect(teamStandingsIndex('Red Bull Racing')).toBe(2);
    expect(teamStandingsIndex('Ferrari')).toBe(3);
    expect(teamStandingsIndex('Williams')).toBe(4);
  });

  it('gives Audi the entry Kick Sauber left, and Cadillac the back of the grid', () => {
    // Audi is Sauber rebranded, so it inherits 2025 ninth. Cadillac is new for
    // 2026 with no 2025 result at all, so it sorts behind the whole field.
    expect(teamStandingsIndex('Audi')).toBe(8);
    expect(teamStandingsIndex('Alpine')).toBe(9);
    expect(teamStandingsIndex('Cadillac')).toBe(10);
  });

  it('sorts unknown or missing teams last', () => {
    expect(teamStandingsIndex('Unknown Team')).toBe(11);
    expect(teamStandingsIndex('')).toBe(11);
    expect(teamStandingsIndex(null)).toBe(11);
    expect(teamStandingsIndex(undefined)).toBe(11);
  });
});

describe('compareDriversByTeam', () => {
  const driver = (displayName: string, team: string, number: number) => ({
    displayName,
    team,
    number,
  });

  it('groups by team, then by car number inside a team', () => {
    const drivers = [
      driver('Oscar Piastri', 'McLaren', 81),
      driver('George Russell', 'Mercedes', 63),
      driver('Lando Norris', 'McLaren', 1),
    ];

    expect(
      [...drivers]
        .sort((a, b) => compareDriversByTeam(a, b))
        .map((d) => d.number),
    ).toEqual([1, 81, 63]);
  });

  it('follows this season when the live table is passed', () => {
    const drivers = [
      driver('Lando Norris', 'McLaren', 1),
      driver('Pierre Gasly', 'Alpine', 10),
    ];
    const livePoints = new Map([['Alpine', 58]]);

    expect(
      [...drivers]
        .sort((a, b) => compareDriversByTeam(a, b, livePoints))
        .map((d) => d.team),
    ).toEqual(['Alpine', 'McLaren']);
  });

  it('falls back to last season when nobody has scored yet', () => {
    const drivers = [
      driver('Pierre Gasly', 'Alpine', 10),
      driver('Lando Norris', 'McLaren', 1),
    ];

    expect(
      [...drivers]
        .sort((a, b) => compareDriversByTeam(a, b, new Map()))
        .map((d) => d.team),
    ).toEqual(['McLaren', 'Alpine']);
  });
});

describe('round-scoped pairings', () => {
  const teamFor = (round: number, code: string) =>
    pairingsForRound(round).find(
      (pairing) => pairing.driver1Code === code || pairing.driver2Code === code,
    )?.team ?? null;

  it('gives every team exactly one pairing in any round', () => {
    for (const round of [1, 11, 12, 23]) {
      const pairings = pairingsForRound(round);
      const teams = pairings.map((pairing) => pairing.team);
      expect(new Set(teams).size).toBe(teams.length);
      expect(teams).toHaveLength(11);
    }
  });

  it('puts Hadjar alongside Verstappen up to round 11 and nobody after', () => {
    expect(teamFor(11, 'HAD')).toBe('Red Bull Racing');
    expect(teamFor(12, 'HAD')).toBeNull();
  });

  it('moves Lawson up and Tsunoda in from round 12', () => {
    // Lawson's wrist-injury callup: the Racing Bulls seat he vacates is
    // Tsunoda's, and neither driver's earlier rounds are disturbed.
    expect(teamFor(11, 'LAW')).toBe('Racing Bulls');
    expect(teamFor(12, 'LAW')).toBe('Red Bull Racing');
    expect(teamFor(11, 'TSU')).toBeNull();
    expect(teamFor(12, 'TSU')).toBe('Racing Bulls');
  });

  it('keeps the pairings on each side of the swap as separate records', () => {
    // The point of round-scoping: round 11 must still read as
    // Verstappen-vs-Hadjar rather than being relabelled by a later change.
    const before = pairingsForRound(11).find(
      (pairing) => pairing.team === 'Red Bull Racing',
    );
    const after = pairingsForRound(12).find(
      (pairing) => pairing.team === 'Red Bull Racing',
    );
    expect(before?.driver2Code).toBe('HAD');
    expect(after?.driver2Code).toBe('LAW');
  });
});

describe('driverStintsForSeason', () => {
  const stintsFor = (code: string) =>
    driverStintsForSeason().filter((stint) => stint.driverCode === code);

  it('merges a driver who only changed team-mates into one unbroken stint', () => {
    // Verstappen appears in two pairings (with Hadjar, then with Lawson) but
    // never left the car, so he must not read as two Red Bull stints.
    expect(stintsFor('VER')).toEqual([
      {
        driverCode: 'VER',
        team: 'Red Bull Racing',
        fromRound: 1,
        toRound: undefined,
      },
    ]);
    expect(stintsFor('LIN')).toEqual([
      {
        driverCode: 'LIN',
        team: 'Racing Bulls',
        fromRound: 1,
        toRound: undefined,
      },
    ]);
  });

  it('splits a driver who actually moved team', () => {
    expect(stintsFor('LAW')).toEqual([
      { driverCode: 'LAW', team: 'Racing Bulls', fromRound: 1, toRound: 11 },
      {
        driverCode: 'LAW',
        team: 'Red Bull Racing',
        fromRound: 12,
        toRound: undefined,
      },
    ]);
  });

  it('closes an injured driver and opens his replacement', () => {
    expect(stintsFor('HAD')).toEqual([
      { driverCode: 'HAD', team: 'Red Bull Racing', fromRound: 1, toRound: 11 },
    ]);
    expect(stintsFor('TSU')).toEqual([
      {
        driverCode: 'TSU',
        team: 'Racing Bulls',
        fromRound: 12,
        toRound: undefined,
      },
    ]);
  });

  it('gives every driver on the grid at least one stint', () => {
    const codes = new Set(driverStintsForSeason().map((s) => s.driverCode));
    for (const pairing of TEAMMATE_PAIRINGS_2026) {
      expect(codes.has(pairing.driver1Code)).toBe(true);
      expect(codes.has(pairing.driver2Code)).toBe(true);
    }
  });
});

describe('coversRound', () => {
  it('treats a missing fromRound as round 1 and a missing toRound as open', () => {
    // Matchup rows written before pairings were round-scoped have neither.
    expect(coversRound({}, 1)).toBe(true);
    expect(coversRound({}, 99)).toBe(true);
  });

  it('treats a non-calendar round as the current grid', () => {
    // Test-scenario races use negative rounds as sentinels. Answering "not
    // racing" for those would strip every driver out of the scenario.
    expect(coversRound({ fromRound: 1, toRound: 11 }, -17)).toBe(false);
    expect(coversRound({ fromRound: 12 }, -17)).toBe(true);
    expect(coversRound({ fromRound: 1 }, -17)).toBe(true);
  });

  it('is inclusive at both ends', () => {
    expect(coversRound({ fromRound: 3, toRound: 5 }, 2)).toBe(false);
    expect(coversRound({ fromRound: 3, toRound: 5 }, 3)).toBe(true);
    expect(coversRound({ fromRound: 3, toRound: 5 }, 5)).toBe(true);
    expect(coversRound({ fromRound: 3, toRound: 5 }, 6)).toBe(false);
  });
});

describe('currentPairings', () => {
  it('returns one pairing per team, with the retired ones dropped', () => {
    const current = currentPairings();
    const teams = current.map((pairing) => pairing.team);
    expect(new Set(teams).size).toBe(teams.length);
    expect(teams).toHaveLength(11);
  });

  it('names the drivers currently in the cars', () => {
    const current = currentPairings();
    const redBull = current.find(
      (pairing) => pairing.team === 'Red Bull Racing',
    );
    const racingBulls = current.find(
      (pairing) => pairing.team === 'Racing Bulls',
    );
    expect(redBull?.driver2Code).toBe('LAW');
    expect(racingBulls?.driver1Code).toBe('TSU');
  });
});

describe('seat moves', () => {
  // Hadjar broke his wrist before round 12. Lawson moves up to Red Bull and
  // Tsunoda takes the Racing Bulls seat Lawson vacated, so two seats change
  // hands at the same boundary and one of them is filled by the driver who
  // left the other.
  it('describes the round 12 change as two seat moves', () => {
    const moves = seatMovesForRound(12);

    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({
      team: 'Red Bull Racing',
      outDriverCode: 'HAD',
      inDriverCode: 'LAW',
    });
    expect(moves).toContainEqual({
      team: 'Racing Bulls',
      outDriverCode: 'LAW',
      inDriverCode: 'TSU',
    });
  });

  // The driver who keeps his seat across the boundary is not news. Reporting
  // Verstappen as "in" would double the size of the announcement and say
  // nothing.
  it('leaves out the driver who held his seat', () => {
    const moves = seatMovesForRound(12);
    expect(moves.some((move) => move.inDriverCode === 'VER')).toBe(false);
    expect(moves.some((move) => move.inDriverCode === 'LIN')).toBe(false);
  });

  it('reports nothing for a round where the grid did not change', () => {
    expect(seatMovesForRound(2)).toEqual([]);
    expect(seatMovesForRound(11)).toEqual([]);
    expect(seatMovesForRound(13)).toEqual([]);
  });

  it('finds the rounds that have a change', () => {
    expect(roundsWithSeatMoves()).toEqual([12]);
  });

  // The announcement is derived from the same list the grid is built from, so
  // this is the property that keeps the two from ever disagreeing.
  it('names drivers who are really in those seats that round', () => {
    for (const round of roundsWithSeatMoves()) {
      for (const move of seatMovesForRound(round)) {
        const pairing = pairingsForRound(round).find(
          (candidate) => candidate.team === move.team,
        );
        expect(
          [pairing?.driver1Code, pairing?.driver2Code],
          `${move.inDriverCode} should be in the ${move.team} car at round ${round}`,
        ).toContain(move.inDriverCode);
      }
    }
  });
});
