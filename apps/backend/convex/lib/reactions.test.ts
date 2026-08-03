import { describe, expect, it } from 'vitest';

import { changeReactionCount, normalizeReactionCounts } from './reactions';

describe('reaction counters', () => {
  it('treats every legacy rev as a fire reaction', () => {
    expect(normalizeReactionCounts(undefined, 3)).toEqual({
      fire: 3,
      nice: 0,
      wow: 0,
      funny: 0,
      oof: 0,
    });
  });

  it('moves a reaction between types without changing the aggregate', () => {
    const before = normalizeReactionCounts(undefined, 3);
    const withoutFire = changeReactionCount(before, 3, 'fire', -1);
    const after = changeReactionCount(withoutFire, 3, 'wow', 1);

    expect(after).toEqual({
      fire: 2,
      nice: 0,
      wow: 1,
      funny: 0,
      oof: 0,
    });
    expect(
      Object.values(after).reduce((total, count) => total + count, 0),
    ).toBe(3);
  });

  it('never lets a per-type count become negative', () => {
    expect(
      changeReactionCount(normalizeReactionCounts(undefined, 0), 0, 'oof', -1)
        .oof,
    ).toBe(0);
  });
});
