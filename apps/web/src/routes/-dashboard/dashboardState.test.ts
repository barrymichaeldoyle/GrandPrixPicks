import { describe, expect, it } from 'vitest';

import type { DashboardSessionState } from './dashboardState';
import { getDashboardWeekendAction } from './dashboardState';

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
