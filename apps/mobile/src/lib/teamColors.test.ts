import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@grandprixpicks/shared/teamFill';
import { teams } from '@grandprixpicks/shared/tokens';

import { displayTeamName, getTeamFill } from './teamColors';

describe('displayTeamName', () => {
  it('shortens Red Bull Racing', () => {
    expect(displayTeamName('Red Bull Racing')).toBe('Red Bull');
  });

  it('leaves other team names unchanged', () => {
    expect(displayTeamName('McLaren')).toBe('McLaren');
  });

  it('returns empty for missing names', () => {
    expect(displayTeamName('')).toBe('');
    expect(displayTeamName(null)).toBe('');
    expect(displayTeamName(undefined)).toBe('');
  });
});

describe('getTeamFill', () => {
  it('gives every team on the grid a readable fill', () => {
    for (const team of Object.keys(teams)) {
      const { fill, ink } = getTeamFill(team);
      expect(contrastRatio(fill, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('falls back for a team not on the grid', () => {
    expect(getTeamFill('Not A Team').fill).toBeTruthy();
  });
});
