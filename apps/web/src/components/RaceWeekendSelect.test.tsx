import { describe, expect, it } from 'vitest';

import type { RaceWeekendOption } from './RaceWeekendSelect';
import { matchesRaceWeekend } from './RaceWeekendSelect';

const italy: RaceWeekendOption = {
  _id: 'italy',
  name: 'Italian Grand Prix',
  round: 13,
  season: 2026,
  slug: 'italy-2026',
};

const saoPaulo: RaceWeekendOption = {
  _id: 'sao-paulo',
  name: 'São Paulo Grand Prix',
  round: 21,
  season: 2026,
  slug: 'sao-paulo-2026',
};

describe('matchesRaceWeekend', () => {
  it('matches everything on an empty query', () => {
    expect(matchesRaceWeekend(italy, '')).toBe(true);
    expect(matchesRaceWeekend(italy, '   ')).toBe(true);
  });

  it('matches the race name, case-insensitively', () => {
    expect(matchesRaceWeekend(italy, 'italian')).toBe(true);
    expect(matchesRaceWeekend(italy, 'ITALIAN')).toBe(true);
    expect(matchesRaceWeekend(italy, 'monaco')).toBe(false);
  });

  it('finds an accented venue typed without the accent', () => {
    expect(matchesRaceWeekend(saoPaulo, 'sao paulo')).toBe(true);
    expect(matchesRaceWeekend(saoPaulo, 'São')).toBe(true);
  });

  it('matches a round number and the "round N" form', () => {
    expect(matchesRaceWeekend(italy, '13')).toBe(true);
    expect(matchesRaceWeekend(italy, 'round 13')).toBe(true);
    expect(matchesRaceWeekend(italy, '12')).toBe(false);
  });

  it('matches the slug token so a country name finds the round', () => {
    expect(matchesRaceWeekend(italy, 'italy')).toBe(true);
    expect(matchesRaceWeekend(saoPaulo, 'sao')).toBe(true);
  });

  it('matches the season', () => {
    expect(matchesRaceWeekend(italy, '2026')).toBe(true);
    expect(matchesRaceWeekend(italy, '2025')).toBe(false);
  });
});
