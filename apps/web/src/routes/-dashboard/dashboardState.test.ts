import { describe, expect, it } from 'vitest';

import type { DashboardSessionState } from './dashboardState';
import {
  firstSessionLockAt,
  getDashboardWeekendAction,
  getSessionClockState,
  liveOrSsr,
  nextSessionTabIndex,
  weekendReflectsViewer,
} from './dashboardState';

function session(
  overrides: Partial<DashboardSessionState> = {},
): DashboardSessionState {
  return {
    sessionType: 'quali',
    lockAt: 2_000,
    isLocked: false,
    hasResult: false,
    hasTop5: false,
    hasH2H: false,
    canCreate: true,
    canEdit: true,
    ...overrides,
  };
}

describe('getDashboardWeekendAction', () => {
  it('prioritises an open session missing Top 5 picks', () => {
    const action = getDashboardWeekendAction([
      session({
        sessionType: 'sprint_quali',
        isLocked: true,
        canCreate: false,
        canEdit: false,
      }),
      session({ sessionType: 'sprint' }),
      session({
        sessionType: 'quali',
        hasTop5: true,
        hasH2H: false,
      }),
    ]);

    expect(action).toEqual({
      kind: 'make_top5',
      label: 'Make picks',
      sessionType: 'sprint',
    });
  });

  it('asks for H2H after Top 5 is complete', () => {
    const action = getDashboardWeekendAction([
      session({ hasTop5: true, hasH2H: false }),
      session({
        sessionType: 'race',
        hasTop5: true,
        hasH2H: true,
      }),
    ]);

    expect(action).toEqual({
      kind: 'finish_h2h',
      label: 'Finish H2H',
      sessionType: 'quali',
    });
  });

  it('reviews complete picks while a session remains writable', () => {
    const action = getDashboardWeekendAction([
      session({ hasTop5: true, hasH2H: true }),
    ]);

    expect(action).toEqual({
      kind: 'review',
      label: 'Review picks',
      sessionType: 'quali',
    });
  });

  it('shows the most recent published result after the weekend locks', () => {
    const action = getDashboardWeekendAction([
      session({
        isLocked: true,
        hasResult: true,
        canCreate: false,
        canEdit: false,
      }),
      session({
        sessionType: 'race',
        isLocked: true,
        hasResult: false,
        canCreate: false,
        canEdit: false,
      }),
    ]);

    expect(action).toEqual({
      kind: 'results',
      label: 'View results',
      sessionType: 'quali',
    });
  });
});

describe('weekendReflectsViewer', () => {
  it('rejects the pre-auth payload, where every session is sign_in-denied', () => {
    // What the weekend query answers with before Clerk's token reaches Convex.
    // Read as real it looks like a weekend with nothing open, which would open
    // the dashboard on the last session of the weekend and call it locked.
    expect(
      weekendReflectsViewer([
        session({
          sessionType: 'sprint',
          canCreate: false,
          canEdit: false,
          denialReason: 'sign_in',
        }),
        session({
          sessionType: 'race',
          canCreate: false,
          canEdit: false,
          denialReason: 'sign_in',
        }),
      ]),
    ).toBe(false);
  });

  it('accepts a weekend that is genuinely all locked for this viewer', () => {
    expect(
      weekendReflectsViewer([
        session({
          sessionType: 'quali',
          canCreate: false,
          canEdit: false,
          denialReason: 'session_locked',
        }),
        session({
          sessionType: 'race',
          canCreate: false,
          canEdit: false,
          denialReason: 'race_not_submittable',
        }),
      ]),
    ).toBe(true);
  });

  it('accepts an open weekend', () => {
    expect(weekendReflectsViewer([session({ denialReason: null })])).toBe(true);
  });

  it('rejects an empty weekend', () => {
    expect(weekendReflectsViewer([])).toBe(false);
  });
});

describe('getSessionClockState', () => {
  it('counts down while the lock is ahead of this device', () => {
    expect(getSessionClockState(session({ lockAt: 5_000 }), 1_000)).toEqual({
      kind: 'countdown',
      msRemaining: 4_000,
    });
  });

  it('reports locking, not locked, once the deadline passes while the backend still allows writes', () => {
    // The regression: this used to fall through to the countdown branch, where
    // `formatLockCountdown` returns "Locked" and the line read
    // "Sprint locks in Locked".
    expect(getSessionClockState(session({ lockAt: 1_000 }), 1_000)).toEqual({
      kind: 'locking',
    });
    expect(getSessionClockState(session({ lockAt: 1_000 }), 9_999)).toEqual({
      kind: 'locking',
    });
  });

  it('prefers results over locked once a session is scored', () => {
    expect(
      getSessionClockState(
        session({ canCreate: false, canEdit: false, hasResult: true }),
        1_000,
      ),
    ).toEqual({ kind: 'results' });
  });

  it('reports locked when writes are refused and nothing is scored', () => {
    expect(
      getSessionClockState(
        session({ canCreate: false, canEdit: false }),
        1_000,
      ),
    ).toEqual({ kind: 'locked' });
  });

  it('has nothing to say without a session', () => {
    expect(getSessionClockState(null, 1_000)).toBeNull();
  });
});

describe('nextSessionTabIndex', () => {
  // Four, because a sprint weekend is the case where wrapping and Home/End
  // actually differ from each other.
  const COUNT = 4;

  it('steps right and left', () => {
    expect(nextSessionTabIndex('ArrowRight', 1, COUNT)).toBe(2);
    expect(nextSessionTabIndex('ArrowLeft', 1, COUNT)).toBe(0);
  });

  it('wraps at both ends', () => {
    expect(nextSessionTabIndex('ArrowRight', COUNT - 1, COUNT)).toBe(0);
    expect(nextSessionTabIndex('ArrowLeft', 0, COUNT)).toBe(COUNT - 1);
  });

  it('jumps to the ends', () => {
    expect(nextSessionTabIndex('Home', 2, COUNT)).toBe(0);
    expect(nextSessionTabIndex('End', 2, COUNT)).toBe(COUNT - 1);
  });

  it('ignores keys the strip does not own', () => {
    // Tab especially: swallowing it would trap focus in the strip.
    for (const key of ['Tab', 'Enter', ' ', 'ArrowUp', 'a']) {
      expect(nextSessionTabIndex(key, 1, COUNT)).toBeNull();
    }
  });

  it('does nothing when focus is not on a tab', () => {
    // -1 is what `findIndex` returns when the event came from the strip's
    // padding or from a child that is not a chip.
    expect(nextSessionTabIndex('ArrowRight', -1, COUNT)).toBeNull();
    expect(nextSessionTabIndex('ArrowRight', COUNT, COUNT)).toBeNull();
  });

  it('does nothing with no tabs to move between', () => {
    expect(nextSessionTabIndex('ArrowRight', 0, 0)).toBeNull();
  });

  it('stays put on a single tab', () => {
    expect(nextSessionTabIndex('ArrowRight', 0, 1)).toBe(0);
    expect(nextSessionTabIndex('ArrowLeft', 0, 1)).toBe(0);
  });
});

describe('liveOrSsr', () => {
  it('prefers the live answer once there is one', () => {
    expect(liveOrSsr('live', 'ssr')).toBe('live');
  });

  it('falls back only while the live query has not answered', () => {
    expect(liveOrSsr(undefined, 'ssr')).toBe('ssr');
  });

  it('lets a live null win, because null is an answer', () => {
    // The regression this guards: with `??` the SSR value would win here, and
    // a player who cleared their picks would keep seeing them.
    expect(liveOrSsr(null, 'ssr')).toBeNull();
  });

  it('is undefined when neither side has anything', () => {
    expect(liveOrSsr(undefined, undefined)).toBeUndefined();
  });

  it('passes a live falsy value through untouched', () => {
    expect(liveOrSsr(0, 99)).toBe(0);
    expect(liveOrSsr('', 'ssr')).toBe('');
    expect(liveOrSsr(false, true)).toBe(false);
  });
});

describe('firstSessionLockAt', () => {
  it('takes the earliest lock, not the first session listed', () => {
    expect(
      firstSessionLockAt([
        session({ sessionType: 'race', lockAt: 9_000 }),
        session({ sessionType: 'quali', lockAt: 3_000 }),
      ]),
    ).toBe(3_000);
  });

  it('ignores sessions with no lock time', () => {
    expect(
      firstSessionLockAt([
        session({ sessionType: 'quali', lockAt: null }),
        session({ sessionType: 'race', lockAt: 5_000 }),
      ]),
    ).toBe(5_000);
  });

  it('is null when nothing on the weekend has a lock time', () => {
    // The dashboard reads this as "nothing has locked", so practice keeps its
    // place above the feed rather than being demoted by a missing schedule.
    expect(firstSessionLockAt([session({ lockAt: null })])).toBeNull();
    expect(firstSessionLockAt([])).toBeNull();
  });
});
