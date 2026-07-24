import { describe, expect, it } from 'vitest';

import { countVisibleWeekends } from './users';

describe('countVisibleWeekends', () => {
  it('counts every predicted weekend for the owner, including the open one', () => {
    // 'upcoming' = the next race, still unlocked. The owner sees their own
    // participation regardless of lock state.
    expect(countVisibleWeekends(['finished', 'locked', 'upcoming'], true)).toBe(
      3,
    );
  });

  it('hides the still-upcoming weekend from non-owners to avoid leaking pre-lock picks', () => {
    // A stranger must not be able to infer that this user has already submitted
    // for the open weekend before it locks.
    expect(
      countVisibleWeekends(['finished', 'locked', 'upcoming'], false),
    ).toBe(2);
  });

  it('counts locked and finished weekends for non-owners once picks are no longer secret', () => {
    expect(countVisibleWeekends(['finished', 'locked'], false)).toBe(2);
  });

  it('returns zero for a non-owner when the only predicted weekend is still upcoming', () => {
    expect(countVisibleWeekends(['upcoming'], false)).toBe(0);
  });

  it('returns zero when the user has predicted nothing', () => {
    expect(countVisibleWeekends([], true)).toBe(0);
    expect(countVisibleWeekends([], false)).toBe(0);
  });
});
