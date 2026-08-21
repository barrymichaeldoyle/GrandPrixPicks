import type { Doc, Id } from '@convex-generated/dataModel';
import { describe, expect, it } from 'vitest';

import type { RosterDriver } from './roster';
import { isRacing, pickPool, resolvePicks } from './roster';

function driver(code: string, racing?: boolean): RosterDriver {
  return {
    _id: code.toLowerCase() as Id<'drivers'>,
    _creationTime: 0,
    code,
    displayName: code,
    createdAt: 0,
    updatedAt: 0,
    racing,
  } as Doc<'drivers'> & { racing?: boolean };
}

// Round 12 of 2026: Hadjar is injured, so he is nameable but not in a car.
const roster = [
  driver('VER', true),
  driver('HAD', false),
  driver('LAW', true),
  driver('TSU', true),
  driver('LIN', true),
];

describe('isRacing', () => {
  it('treats an unflagged driver as racing', () => {
    // SSR-seeded data and fixtures carry no flag; assuming "out" there would
    // empty the pool.
    expect(isRacing(driver('VER'))).toBe(true);
  });
});

describe('pickPool', () => {
  it('does not offer a driver who is out of a car', () => {
    expect(pickPool(roster).map((d) => d.code)).toEqual([
      'VER',
      'LAW',
      'TSU',
      'LIN',
    ]);
  });
});

describe('resolvePicks', () => {
  it('keeps a pick on a driver who is no longer racing', () => {
    // The bug this exists to stop: five saved picks rendering as four slots,
    // which also makes the form think the set is already complete.
    const picks = ['ver', 'had', 'law', 'tsu', 'lin'] as Id<'drivers'>[];
    const resolved = resolvePicks(picks, roster);
    expect(resolved).toHaveLength(5);
    expect(resolved.map((d) => d.code)).toEqual([
      'VER',
      'HAD',
      'LAW',
      'TSU',
      'LIN',
    ]);
  });

  it('preserves the picked order rather than the roster order', () => {
    const picks = ['lin', 'ver'] as Id<'drivers'>[];
    expect(resolvePicks(picks, roster).map((d) => d.code)).toEqual([
      'LIN',
      'VER',
    ]);
  });

  it('skips an id with no driver record at all', () => {
    const picks = ['ver', 'ghost'] as Id<'drivers'>[];
    expect(resolvePicks(picks, roster).map((d) => d.code)).toEqual(['VER']);
  });
});
