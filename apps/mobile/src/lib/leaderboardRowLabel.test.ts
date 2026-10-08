import { describe, expect, it } from 'vitest';

import { leaderboardRowLabel, ordinal } from './leaderboardRowLabel';

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [111, '111th'],
  ])('%i → %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe('leaderboardRowLabel', () => {
  it('reads place, name and points without the avatar or "pts"', () => {
    expect(
      leaderboardRowLabel({ rank: 1, name: 'Overcut King', points: 26 }),
    ).toBe('1st, Overcut King, 26 points');
  });

  it('marks your own row and keeps the subline', () => {
    expect(
      leaderboardRowLabel({
        rank: 11,
        name: 'barrymichaeldoyle',
        points: 1,
        isViewer: true,
        subline: '3 sessions',
      }),
    ).toBe('11th, barrymichaeldoyle, you, 3 sessions, 1 point');
  });

  it('reads an H2H tally as words', () => {
    expect(
      leaderboardRowLabel({
        rank: 2,
        name: 'Grid Hero',
        points: 12,
        subline: '12/20 correct',
      }),
    ).toBe('2nd, Grid Hero, 12 of 20 correct, 12 points');
  });
});
