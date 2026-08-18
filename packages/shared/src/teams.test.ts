import { describe, expect, it } from 'vitest';

import { compareDriversByTeam, teamStandingsIndex } from './teams';

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
