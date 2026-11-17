import { describe, expect, it } from 'vitest';

import { newsTeam } from './newsTeam';

describe('newsTeam', () => {
  it('takes an explicit team over the drivers', () => {
    expect(newsTeam('McLaren', [])).toBe('McLaren');
    expect(newsTeam('McLaren', [{ team: 'Ferrari' }])).toBe('McLaren');
  });

  it('gives a story the team every named driver drives for', () => {
    expect(
      newsTeam(undefined, [{ team: 'Mercedes' }, { team: 'Mercedes' }]),
    ).toBe('Mercedes');
  });

  it('gives a story about two teams, or about nobody, no team', () => {
    expect(
      newsTeam(undefined, [{ team: 'Mercedes' }, { team: 'McLaren' }]),
    ).toBe(null);
    expect(newsTeam(undefined, [])).toBe(null);
    expect(newsTeam(null, undefined)).toBe(null);
    expect(newsTeam(undefined, [{ team: null }])).toBe(null);
  });
});
