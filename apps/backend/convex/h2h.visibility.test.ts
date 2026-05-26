import { describe, expect, it } from 'vitest';

import { canViewH2HPicksForSession } from './h2h';

describe('canViewH2HPicksForSession', () => {
  const lockTime = 1_000_000;

  it('allows owners before lock', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: true,
        lockTime,
        now: lockTime - 1,
      }),
    ).toBe(true);
  });

  it('blocks non-owners before lock', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: false,
        lockTime,
        now: lockTime - 1,
      }),
    ).toBe(false);
  });

  it('blocks non-owners when lock time is missing', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: false,
        lockTime: undefined,
        now: lockTime + 1,
      }),
    ).toBe(false);
  });

  it('allows non-owners after lock', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: false,
        lockTime,
        now: lockTime,
      }),
    ).toBe(true);
  });
});
