import { describe, expect, test } from 'vitest';

import type { Id } from '../_generated/dataModel';
import type { Stint } from './lineups';
import { rosterForRound, teamForRound } from './lineups';

function driverId(value: string) {
  return value as Id<'drivers'>;
}

function stint(
  driver: string,
  team: string,
  fromRound: number,
  toRound?: number,
): Stint {
  return {
    _id: `stint-${driver}-${fromRound}` as Id<'driverTeamStints'>,
    _creationTime: 0,
    driverId: driverId(driver),
    season: 2026,
    team,
    fromRound,
    toRound,
    createdAt: 0,
    updatedAt: 0,
  };
}

// The Dutch GP (round 12) lineup change: Hadjar is injured, Lawson moves up
// from Racing Bulls to Red Bull, Tsunoda takes the vacated Racing Bulls seat.
const stints = new Map<string, Stint[]>([
  ['ver', [stint('ver', 'Red Bull Racing', 1)]],
  ['had', [stint('had', 'Red Bull Racing', 1, 11)]],
  [
    'law',
    [stint('law', 'Racing Bulls', 1, 11), stint('law', 'Red Bull Racing', 12)],
  ],
  ['tsu', [stint('tsu', 'Racing Bulls', 12)]],
  ['lin', [stint('lin', 'Racing Bulls', 1)]],
]);

const grid = [
  { _id: driverId('ver'), code: 'VER', team: 'Red Bull Racing' },
  { _id: driverId('had'), code: 'HAD', team: 'Red Bull Racing' },
  { _id: driverId('law'), code: 'LAW', team: 'Red Bull Racing' },
  { _id: driverId('tsu'), code: 'TSU', team: 'Racing Bulls' },
  { _id: driverId('lin'), code: 'LIN', team: 'Racing Bulls' },
];

function codesIn(round: number) {
  return rosterForRound(grid, stints, round).map((driver) => driver.code);
}

describe('teamForRound', () => {
  test('answers with the car the driver was actually in', () => {
    expect(teamForRound(stints, 'law', 11)).toBe('Racing Bulls');
    expect(teamForRound(stints, 'law', 12)).toBe('Red Bull Racing');
  });

  test('returns null for a round the driver was not racing', () => {
    expect(teamForRound(stints, 'had', 12)).toBeNull();
    expect(teamForRound(stints, 'tsu', 11)).toBeNull();
  });

  test('returns null for a driver with no stints at all', () => {
    expect(teamForRound(stints, 'nobody', 12)).toBeNull();
  });
});

describe('rosterForRound', () => {
  test('drops the injured driver and admits his replacement', () => {
    expect(codesIn(11)).toEqual(['VER', 'HAD', 'LAW', 'LIN']);
    expect(codesIn(12)).toEqual(['VER', 'LAW', 'TSU', 'LIN']);
  });

  test('reports the team each driver drove for in that round', () => {
    // Lawson's driver row says Red Bull today; round 11 must still say Racing
    // Bulls, which is what keeps an old race page in the right colours.
    const round11 = rosterForRound(grid, stints, 11);
    expect(round11.find((d) => d.code === 'LAW')?.team).toBe('Racing Bulls');

    const round12 = rosterForRound(grid, stints, 12);
    expect(round12.find((d) => d.code === 'LAW')?.team).toBe('Red Bull Racing');
  });

  test('keeps a driver with no stints, so an un-backfilled deployment still serves a grid', () => {
    const withUnknown = [
      ...grid,
      { _id: driverId('new'), code: 'NEW', team: 'Haas' },
    ];
    const roster = rosterForRound(withUnknown, stints, 12);
    expect(roster.map((d) => d.code)).toContain('NEW');
    expect(roster.find((d) => d.code === 'NEW')?.team).toBe('Haas');
  });
});
