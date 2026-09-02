import { describe, expect, it } from 'vitest';

import type { ComboboxOption } from './ChinwagCombobox';
import { matchesQuery } from './ChinwagCombobox';

const perez: ComboboxOption = {
  code: 'PER',
  label: 'Sergio Pérez',
  nationality: 'MX',
  team: 'Cadillac',
  value: 'PER',
};

const hulkenberg: ComboboxOption = {
  code: 'HUL',
  label: 'Nico Hülkenberg',
  nationality: 'DE',
  team: 'Audi',
  value: 'HUL',
};

const team: ComboboxOption = {
  label: 'Racing Bulls',
  team: 'Racing Bulls',
  value: 'Racing Bulls',
};

describe('matchesQuery', () => {
  it('matches everything on an empty query', () => {
    expect(matchesQuery(perez, '')).toBe(true);
  });

  /**
   * The reason this exists. Two of the twenty-two drivers carry a diacritic and
   * both are names a fan types from memory rather than copies, so an exact
   * match would leave them findable only by code or by scrolling.
   */
  it('finds an accented name typed without the accent', () => {
    expect(matchesQuery(perez, 'perez')).toBe(true);
    expect(matchesQuery(hulkenberg, 'hulkenberg')).toBe(true);
  });

  it('still finds it typed with the accent', () => {
    expect(matchesQuery(perez, 'Pérez')).toBe(true);
  });

  it('matches the three-letter code from the front', () => {
    expect(matchesQuery(perez, 'per')).toBe(true);
  });

  /**
   * Codes match as a prefix, not a substring, so typing two letters narrows
   * rather than surfacing every code that happens to contain them. Checked on a
   * synthetic option because every real driver's code is a fragment of their
   * own surname, which the name rule would match anyway.
   */
  it('does not match a code from the middle', () => {
    const synthetic: ComboboxOption = {
      code: 'XYZ',
      label: 'Someone Else',
      team: 'Another Team',
      value: 'XYZ',
    };

    expect(matchesQuery(synthetic, 'xyz')).toBe(true);
    expect(matchesQuery(synthetic, 'yz')).toBe(false);
  });

  it('matches on team, so a team name surfaces its drivers', () => {
    expect(matchesQuery(perez, 'cadillac')).toBe(true);
    expect(matchesQuery(hulkenberg, 'cadillac')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(matchesQuery(perez, 'SERGIO')).toBe(true);
  });

  it('works for a team option, which carries no code or flag', () => {
    expect(matchesQuery(team, 'racing')).toBe(true);
    expect(matchesQuery(team, 'ferrari')).toBe(false);
  });
});
