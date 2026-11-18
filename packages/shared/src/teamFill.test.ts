import { describe, expect, it } from 'vitest';

import { contrastRatio, inkForFill, readableTeamFill } from './teamFill';
import { colors, teams } from './tokens';

describe('readableTeamFill', () => {
  it.each(Object.entries(teams))(
    '%s reads at 4.5:1 or better as a fill',
    (_team, color) => {
      const { fill, ink } = readableTeamFill(color);
      expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('darkens Ferrari red rather than putting unreadable ink on it', () => {
    const { fill, ink } = readableTeamFill(teams.Ferrari);
    expect(fill).not.toBe(teams.Ferrari);
    expect(ink).toBe(colors.text);
  });
});

describe('inkForFill', () => {
  it('puts near-black on a light fill', () => {
    expect(inkForFill('#ffffff')).toBe(colors.textOnAccent);
  });
});
