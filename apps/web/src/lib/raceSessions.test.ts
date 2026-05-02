import { describe, expect, it } from 'vitest';

import {
  getFirstSessionLockAt,
  isRaceSelectableForLeaderboard,
} from './raceSessions';

const HOUR = 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe('getFirstSessionLockAt', () => {
  it('returns sprint quali lock for sprint weekends', () => {
    expect(
      getFirstSessionLockAt({
        hasSprint: true,
        sprintQualiLockAt: NOW - 2 * HOUR,
        qualiLockAt: NOW + 24 * HOUR,
      }),
    ).toBe(NOW - 2 * HOUR);
  });

  it('falls back to quali lock if sprint quali lock missing on a sprint weekend', () => {
    expect(
      getFirstSessionLockAt({
        hasSprint: true,
        sprintQualiLockAt: undefined,
        qualiLockAt: NOW + 24 * HOUR,
      }),
    ).toBe(NOW + 24 * HOUR);
  });

  it('returns quali lock for regular weekends', () => {
    expect(
      getFirstSessionLockAt({
        hasSprint: false,
        sprintQualiLockAt: undefined,
        qualiLockAt: NOW + 24 * HOUR,
      }),
    ).toBe(NOW + 24 * HOUR);
  });

  it('returns undefined when no lock times are set', () => {
    expect(
      getFirstSessionLockAt({
        hasSprint: false,
        sprintQualiLockAt: undefined,
        qualiLockAt: undefined,
      }),
    ).toBeUndefined();
  });
});

describe('isRaceSelectableForLeaderboard', () => {
  it('includes finished races', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'finished',
          hasSprint: false,
          sprintQualiLockAt: undefined,
          qualiLockAt: NOW + 24 * HOUR,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('includes locked races', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'locked',
          hasSprint: false,
          sprintQualiLockAt: undefined,
          qualiLockAt: NOW + 24 * HOUR,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('includes upcoming races whose first session has already locked (mid-weekend)', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'upcoming',
          hasSprint: true,
          sprintQualiLockAt: NOW - HOUR,
          qualiLockAt: NOW + 24 * HOUR,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('excludes upcoming races whose first session has not yet locked', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'upcoming',
          hasSprint: false,
          sprintQualiLockAt: undefined,
          qualiLockAt: NOW + HOUR,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('excludes cancelled races even if their first session lock time is in the past', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'cancelled',
          hasSprint: false,
          sprintQualiLockAt: undefined,
          qualiLockAt: NOW - HOUR,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('treats lock time exactly equal to now as locked', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'upcoming',
          hasSprint: false,
          sprintQualiLockAt: undefined,
          qualiLockAt: NOW,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('excludes upcoming races with no lock times set', () => {
    expect(
      isRaceSelectableForLeaderboard(
        {
          status: 'upcoming',
          hasSprint: false,
          sprintQualiLockAt: undefined,
          qualiLockAt: undefined,
        },
        NOW,
      ),
    ).toBe(false);
  });
});
