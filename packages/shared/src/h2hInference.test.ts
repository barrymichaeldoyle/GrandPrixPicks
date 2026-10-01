import { describe, expect, it } from 'vitest';

import {
  followedH2HPick,
  impliedH2HWinner,
  inferH2HPicks,
} from './h2hInference';

describe('impliedH2HWinner', () => {
  it('picks the driver in the Top 5 over a team-mate who is not', () => {
    expect(impliedH2HWinner('a', 'b', ['x', 'b', 'y'])).toBe('b');
    expect(impliedH2HWinner('a', 'b', ['a'])).toBe('a');
  });

  it('picks the higher slot when both team-mates are in the Top 5', () => {
    expect(impliedH2HWinner('a', 'b', ['b', 'x', 'a'])).toBe('b');
    expect(impliedH2HWinner('a', 'b', ['a', 'b'])).toBe('a');
  });

  it('leaves a duel open when neither driver is in the Top 5', () => {
    expect(impliedH2HWinner('a', 'b', ['x', 'y'])).toBeNull();
    expect(impliedH2HWinner('a', 'b', [])).toBeNull();
  });
});

describe('inferH2HPicks', () => {
  it('answers only the duels the Top 5 touches', () => {
    const matchups = [
      { matchupId: 'm1', driver1Id: 'a', driver2Id: 'b' },
      { matchupId: 'm2', driver1Id: 'c', driver2Id: 'd' },
      { matchupId: 'm3', driver1Id: 'e', driver2Id: 'f' },
    ];
    expect(inferH2HPicks(matchups, ['d', 'a', 'b', 'x', 'y'])).toEqual({
      m1: 'a',
      m2: 'd',
    });
  });
});

describe('followedH2HPick', () => {
  const base = { driver1Id: 'a', driver2Id: 'b' } as const;

  it('moves a pick that agreed with the old Top 5', () => {
    expect(
      followedH2HPick({
        ...base,
        savedWinnerId: 'a',
        previousTopFive: ['a'],
        nextTopFive: ['b'],
      }),
    ).toBe('b');
  });

  it('never touches a hedge', () => {
    expect(
      followedH2HPick({
        ...base,
        savedWinnerId: 'b',
        previousTopFive: ['a'],
        nextTopFive: ['x'],
      }),
    ).toBeNull();
  });

  it('keeps the pick when the new Top 5 says nothing about the duel', () => {
    expect(
      followedH2HPick({
        ...base,
        savedWinnerId: 'a',
        previousTopFive: ['a'],
        nextTopFive: ['x'],
      }),
    ).toBeNull();
  });

  it('keeps a pick the old Top 5 had no opinion on', () => {
    expect(
      followedH2HPick({
        ...base,
        savedWinnerId: 'a',
        previousTopFive: ['x'],
        nextTopFive: ['b'],
      }),
    ).toBeNull();
  });
});
