import { describe, expect, test } from 'vitest';

import { type ChampionshipTable, tallyDriverPoints } from './f1Standings';
import {
  buildDriverDeltas,
  buildTeamDeltas,
  rankMovers,
  type StandingsDelta,
} from './qualifyingChampionship';

/** The options the qualifying championship tallies with. */
const QUALI_OPTIONS = { headlineSession: 'quali', podiumDepth: 2 } as const;

describe('scoring a season on qualifying', () => {
  test('qualifying pays the race table and sprint qualifying pays the sprint table', () => {
    const tally = tallyDriverPoints(
      [
        { sessionType: 'quali', round: 1, classification: ['ver', 'nor'] },
        {
          sessionType: 'sprint_quali',
          round: 1,
          classification: ['nor', 'ver'],
        },
      ],
      QUALI_OPTIONS,
    );

    // ver: pole (25) + sprint qualifying P2 (7). nor: P2 (18) + P1 (8).
    expect(tally.get('ver')?.points).toBe(25 + 7);
    expect(tally.get('nor')?.points).toBe(18 + 8);
  });

  test('counts poles from qualifying only, never sprint qualifying', () => {
    const tally = tallyDriverPoints(
      [
        { sessionType: 'quali', round: 1, classification: ['ver', 'nor'] },
        {
          sessionType: 'sprint_quali',
          round: 1,
          classification: ['nor', 'ver'],
        },
      ],
      QUALI_OPTIONS,
    );

    expect(tally.get('ver')?.wins).toBe(1);
    // nor took sprint qualifying, which is not a pole.
    expect(tally.get('nor')?.wins).toBe(0);
  });

  test('a front row is the top two, not the top three', () => {
    const tally = tallyDriverPoints(
      [
        {
          sessionType: 'quali',
          round: 1,
          classification: ['ver', 'nor', 'lec'],
        },
      ],
      QUALI_OPTIONS,
    );

    expect(tally.get('ver')?.podiums).toBe(1);
    expect(tally.get('nor')?.podiums).toBe(1);
    // Third on the grid starts row two.
    expect(tally.get('lec')?.podiums).toBe(0);
  });

  test('a driver with no time scores nothing and costs nobody a place', () => {
    const tally = tallyDriverPoints(
      [
        {
          sessionType: 'quali',
          round: 1,
          classification: ['ver', 'nor', 'lec'],
          dnfDriverIds: ['nor'],
        },
      ],
      QUALI_OPTIONS,
    );

    expect(tally.get('nor')?.points).toBe(0);
    // lec is P2 on the grid, not P3: the driver without a time does not
    // occupy a classifying position ahead of them.
    expect(tally.get('lec')?.points).toBe(18);
  });

  test('leaves the real championship untouched', () => {
    // The same sessions scored the normal way award nothing on Saturday.
    const tally = tallyDriverPoints([
      { sessionType: 'race', round: 1, classification: ['ver', 'nor'] },
    ]);

    expect(tally.get('ver')).toMatchObject({ points: 25, wins: 1, podiums: 1 });
  });
});

/** A standings row carrying only what the delta builders read. */
function driverRow(driverId: string, position: number, points: number) {
  return {
    driverId,
    code: driverId.toUpperCase(),
    displayName: driverId,
    team: 'Red Bull',
    nationality: null,
    number: null,
    points,
    wins: 0,
    podiums: 0,
    position,
  };
}

function table(
  drivers: ReturnType<typeof driverRow>[],
  constructors: { team: string; points: number; position: number }[] = [],
): ChampionshipTable {
  return {
    lastUpdated: null,
    roundsScored: drivers.length > 0 ? 1 : 0,
    roundsTotal: 24,
    calendar: [],
    lastRound: null,
    nextRound: null,
    pointsRemaining: 0,
    drivers: drivers as unknown as ChampionshipTable['drivers'],
    constructors: constructors.map((entry) => ({
      ...entry,
      wins: 0,
    })) as unknown as ChampionshipTable['constructors'],
  };
}

describe('buildDriverDeltas', () => {
  test('reads positive as places gained on Saturday', () => {
    const deltas = buildDriverDeltas(
      table([driverRow('ham', 4, 60)]),
      table([driverRow('ham', 8, 40)]),
    );

    // Eighth in the championship, fourth on Saturdays: four places better.
    expect(deltas[0]).toMatchObject({
      qualifyingPosition: 4,
      championshipPosition: 8,
      delta: 4,
      qualifyingPoints: 60,
      championshipPoints: 40,
    });
  });

  test('is negative for a driver who ranks worse on Saturday', () => {
    const deltas = buildDriverDeltas(
      table([driverRow('oco', 9, 20)]),
      table([driverRow('oco', 6, 30)]),
    );

    expect(deltas[0]?.delta).toBe(-3);
  });

  test('carries poles and front rows from the qualifying table', () => {
    // The drivers table shows Poles and Front rows columns, and they must be
    // Saturday's counts, not the race wins the championship table holds.
    const saturday = { ...driverRow('ver', 1, 100), wins: 3, podiums: 7 };
    const deltas = buildDriverDeltas(
      table([saturday]),
      table([driverRow('ver', 1, 100)]),
    );

    expect(deltas[0]).toMatchObject({ wins: 3, podiums: 7 });
  });

  test('drops a driver missing from the real championship table', () => {
    const deltas = buildDriverDeltas(
      table([driverRow('ver', 1, 100), driverRow('ghost', 2, 90)]),
      table([driverRow('ver', 1, 100)]),
    );

    expect(deltas.map((entry) => entry.driverId)).toEqual(['ver']);
  });
});

describe('buildTeamDeltas', () => {
  test('pairs the two constructors tables by team', () => {
    const deltas = buildTeamDeltas(
      table([], [{ team: 'Williams', points: 90, position: 3 }]),
      table([], [{ team: 'Williams', points: 40, position: 6 }]),
    );

    expect(deltas[0]).toMatchObject({
      team: 'Williams',
      qualifyingPosition: 3,
      championshipPosition: 6,
      delta: 3,
    });
  });
});

describe('rankMovers', () => {
  function delta(driverId: string, quali: number, real: number) {
    return {
      driverId,
      code: driverId,
      displayName: driverId,
      team: null,
      nationality: null,
      number: null,
      qualifyingPosition: quali,
      championshipPosition: real,
      wins: 0,
      podiums: 0,
      delta: real - quali,
      qualifyingPoints: 0,
      championshipPoints: 0,
    } satisfies StandingsDelta;
  }

  test('orders by the size of the gap, in either direction', () => {
    const movers = rankMovers(
      [delta('a', 4, 6), delta('b', 12, 5), delta('c', 2, 3)],
      10,
    );

    // b moved 7 places, a moved 2, c moved 1.
    expect(movers.map((entry) => entry.driverId)).toEqual(['b', 'a', 'c']);
  });

  test('drops drivers whose two positions agree', () => {
    const movers = rankMovers([delta('a', 3, 3), delta('b', 5, 7)], 10);

    expect(movers.map((entry) => entry.driverId)).toEqual(['b']);
  });

  test('names the better qualifier first when two moved equally far', () => {
    const movers = rankMovers([delta('slow', 14, 17), delta('fast', 2, 5)], 10);

    expect(movers.map((entry) => entry.driverId)).toEqual(['fast', 'slow']);
  });

  test('honours the limit', () => {
    const movers = rankMovers([delta('a', 1, 9), delta('b', 2, 9)], 1);

    expect(movers).toHaveLength(1);
  });
});
