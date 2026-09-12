import { describe, expect, it } from 'vitest';

import { toBoardEntry, toPublicEntry } from './userIdentity';

const named = {
  username: 'pole-sitter',
  displayName: 'Pole Sitter',
  points: 10,
};

describe('toPublicEntry', () => {
  it('drops displayName so the payload is usernames only', () => {
    expect(toPublicEntry(named)).toEqual({
      username: 'pole-sitter',
      points: 10,
    });
  });
});

describe('toBoardEntry', () => {
  it('keeps displayName once there is a viewer', () => {
    expect(toBoardEntry(named, { _id: 'viewer' })).toEqual(named);
  });

  it('strips displayName for an unsigned response', () => {
    expect(toBoardEntry(named, null)).toEqual({
      username: 'pole-sitter',
      points: 10,
    });
  });

  it('strips a missing displayName even for a viewer', () => {
    expect(
      toBoardEntry(
        { username: 'pole-sitter', displayName: undefined, points: 10 },
        { _id: 'viewer' },
      ),
    ).toEqual({
      username: 'pole-sitter',
      points: 10,
    });
  });
});
