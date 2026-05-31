import { describe, expect, it } from 'vitest';

import { teamStandingsIndex } from './teams';

describe('teamStandingsIndex', () => {
  it('returns the constructor standings order index for known teams', () => {
    expect(teamStandingsIndex('McLaren')).toBe(0);
    expect(teamStandingsIndex('Ferrari')).toBe(1);
    expect(teamStandingsIndex('Cadillac')).toBe(10);
  });

  it('sorts unknown or missing teams last', () => {
    expect(teamStandingsIndex('Unknown Team')).toBe(11);
    expect(teamStandingsIndex('')).toBe(11);
    expect(teamStandingsIndex(null)).toBe(11);
    expect(teamStandingsIndex(undefined)).toBe(11);
  });
});
