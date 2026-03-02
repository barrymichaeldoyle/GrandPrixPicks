import { describe, expect, it } from 'vitest';

import { displayTeamName } from './display';

describe('displayTeamName', () => {
  it('applies known short names', () => {
    expect(displayTeamName('Red Bull Racing')).toBe('Red Bull');
  });

  it('keeps unknown names unchanged', () => {
    expect(displayTeamName('McLaren')).toBe('McLaren');
  });

  it('returns empty string for nullish/empty values', () => {
    expect(displayTeamName('')).toBe('');
    expect(displayTeamName(null)).toBe('');
    expect(displayTeamName(undefined)).toBe('');
  });
});
