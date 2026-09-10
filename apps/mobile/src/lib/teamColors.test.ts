import { describe, expect, it } from 'vitest';

import { displayTeamName } from './teamColors';

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
