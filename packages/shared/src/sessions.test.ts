import { describe, expect, it } from 'vitest';

import {
  getFirstSessionLockAt,
  getMissingEarlierSessions,
  isRaceSelectableForLeaderboard,
} from './sessions';

describe('getMissingEarlierSessions', () => {
  it('requires quali before race on a regular weekend', () => {
    expect(getMissingEarlierSessions(false, 'race', [])).toEqual(['quali']);
  });

  it('allows race once quali is published on a regular weekend', () => {
    expect(getMissingEarlierSessions(false, 'race', ['quali'])).toEqual([]);
  });

  it('never blocks the first session of the weekend', () => {
    expect(getMissingEarlierSessions(false, 'quali', [])).toEqual([]);
    expect(getMissingEarlierSessions(true, 'sprint_quali', [])).toEqual([]);
  });

  it('lists every missing earlier session on a sprint weekend', () => {
    expect(getMissingEarlierSessions(true, 'race', [])).toEqual([
      'sprint_quali',
      'sprint',
      'quali',
    ]);
    expect(getMissingEarlierSessions(true, 'race', ['sprint_quali'])).toEqual([
      'sprint',
      'quali',
    ]);
    expect(getMissingEarlierSessions(true, 'quali', ['sprint_quali'])).toEqual([
      'sprint',
    ]);
  });

  it('returns nothing for sessions outside the weekend order', () => {
    // Sprint sessions don't exist on a regular weekend; validity of the
    // session itself is checked separately.
    expect(getMissingEarlierSessions(false, 'sprint', [])).toEqual([]);
  });
});

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
