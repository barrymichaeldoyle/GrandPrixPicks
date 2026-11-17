import { colors } from '@grandprixpicks/shared/tokens';
import { describe, expect, it } from 'vitest';

import { readableTeamFill, TEAM_COLORS, teamFillStyle } from './teamColors';

function luminance(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('readableTeamFill', () => {
  it.each(Object.entries(TEAM_COLORS))(
    '%s reads at 4.5:1 or better as a fill',
    (_team, color) => {
      const { fill, ink } = readableTeamFill(color);
      expect(contrast(fill, ink)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('leaves a livery that already reads untouched', () => {
    expect(readableTeamFill(TEAM_COLORS.McLaren!)).toEqual({
      fill: TEAM_COLORS.McLaren,
      ink: colors.textOnAccent,
    });
  });

  it('darkens Ferrari red rather than putting unreadable ink on it', () => {
    const { fill, ink } = readableTeamFill(TEAM_COLORS.Ferrari!);
    expect(fill).not.toBe(TEAM_COLORS.Ferrari);
    expect(ink).toBe(colors.text);
  });

  it('falls back for a team not on the grid', () => {
    expect(teamFillStyle('Not A Team')['--team-fill']).toBeTruthy();
  });
});
