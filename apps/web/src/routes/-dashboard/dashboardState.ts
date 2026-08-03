import type { SessionType } from '@/lib/sessions';

export type DashboardSessionState = {
  sessionType: SessionType;
  lockAt: number | null;
  isLocked: boolean;
  hasResult: boolean;
  hasTop5: boolean;
  hasH2H: boolean;
  canCreate: boolean;
  canEdit: boolean;
};

export type DashboardWeekendAction =
  | {
      kind: 'make_top5';
      label: 'Make picks';
      sessionType: SessionType;
    }
  | {
      kind: 'finish_h2h';
      label: 'Finish H2H';
      sessionType: SessionType;
    }
  | {
      kind: 'review';
      label: 'Review picks';
      sessionType: SessionType;
    }
  | {
      kind: 'results';
      label: 'View results';
      sessionType: SessionType;
    }
  | {
      kind: 'locked';
      label: 'View picks';
      sessionType: SessionType;
    };

/**
 * Picks are the dashboard's primary job. Select the earliest actionable
 * session, while respecting the backend's capability flags rather than
 * re-deriving whether a session may still be changed.
 */
export function getDashboardWeekendAction(
  sessions: ReadonlyArray<DashboardSessionState>,
): DashboardWeekendAction | null {
  const writable = sessions.filter(
    (session) => session.canCreate || session.canEdit,
  );

  const missingTop5 = writable.find((session) => !session.hasTop5);
  if (missingTop5) {
    return {
      kind: 'make_top5',
      label: 'Make picks',
      sessionType: missingTop5.sessionType,
    };
  }

  const missingH2H = writable.find(
    (session) => session.hasTop5 && !session.hasH2H,
  );
  if (missingH2H) {
    return {
      kind: 'finish_h2h',
      label: 'Finish H2H',
      sessionType: missingH2H.sessionType,
    };
  }

  const nextWritable = writable[0];
  if (nextWritable) {
    return {
      kind: 'review',
      label: 'Review picks',
      sessionType: nextWritable.sessionType,
    };
  }

  const latestResult = [...sessions]
    .reverse()
    .find((session) => session.hasResult);
  if (latestResult) {
    return {
      kind: 'results',
      label: 'View results',
      sessionType: latestResult.sessionType,
    };
  }

  const latestSession = sessions.at(-1);
  if (latestSession) {
    return {
      kind: 'locked',
      label: 'View picks',
      sessionType: latestSession.sessionType,
    };
  }

  return null;
}
