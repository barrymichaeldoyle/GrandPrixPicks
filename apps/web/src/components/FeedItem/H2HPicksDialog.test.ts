import { describe, expect, test } from 'vitest';

import { loadingRowsFor } from './H2HPicksDialog';

describe('loadingRowsFor', () => {
  test('falls back to last season when this season is unknown', () => {
    // Nothing has loaded yet, so the best available order is 2025's final
    // classification: McLaren, then Mercedes.
    const teams = loadingRowsFor(undefined).map((duel) => duel.team);
    expect(teams.slice(0, 2)).toEqual(['McLaren', 'Mercedes']);
  });

  test('uses this season order once it arrives', () => {
    const live = ['Ferrari', 'Audi', 'McLaren'];
    const teams = loadingRowsFor(live).map((duel) => duel.team);
    expect(teams.slice(0, 3)).toEqual(live);
  });

  test('sorts a team the live order omits after every team it names', () => {
    // A grid team with no championship entry yet must not float to the top,
    // which is what an "unknown ranks first" fallback would do.
    const teams = loadingRowsFor(['Ferrari']).map((duel) => duel.team);
    expect(teams[0]).toBe('Ferrari');
    expect(teams).toContain('McLaren');
    expect(teams.indexOf('McLaren')).toBeGreaterThan(0);
  });

  test('draws each team exactly once', () => {
    const teams = loadingRowsFor(undefined).map((duel) => duel.team);
    expect(new Set(teams).size).toBe(teams.length);
  });
});
