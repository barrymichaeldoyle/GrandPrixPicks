import { describe, expect, it } from 'vitest';

import { teamCode } from './teamCode';
import { teams } from './tokens';

describe('teamCode', () => {
  it('gives every team on the grid its own three-letter code', () => {
    const codes = Object.keys(teams).map(teamCode);
    expect(codes.every((code) => /^[A-Z]{3}$/.test(code))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('falls back to the first three letters of an unknown team', () => {
    expect(teamCode('Andretti Global')).toBe('AND');
  });
});
