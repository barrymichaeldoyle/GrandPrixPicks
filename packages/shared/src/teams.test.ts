import { describe, expect, it } from 'vitest';

import { teamStandingsIndex } from './teams';

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
