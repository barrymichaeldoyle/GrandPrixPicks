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
  /** Why writes are refused; see the backend's SessionCapability. */
  denialReason?: 'sign_in' | 'session_locked' | 'race_not_submittable' | null;
};

/**
 * Whether this weekend payload was computed for the signed-in viewer.
 *
 * The weekend query resolves before Clerk's token reaches Convex, and that
 * first payload reports every session as `sign_in`-denied: no writable
 * sessions, so no action, no countdown and no sensible session to open on.
 * Nothing derived from capabilities is trustworthy until this is true. The
 * dashboard is only rendered for signed-in users, so a signed-out payload here
 * always means "auth has not landed yet" rather than "this viewer is a guest".
 */
export function weekendReflectsViewer(
  sessions: readonly DashboardSessionState[],
): boolean {
  return sessions.some((session) => session.denialReason !== 'sign_in');
}

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
  sessions: readonly DashboardSessionState[],
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

/** What the line under the race name should say about the selected session. */
export type SessionClockState =
  | { kind: 'countdown'; msRemaining: number }
  | { kind: 'locking' }
  | { kind: 'results' }
  | { kind: 'locked' };

/**
 * Chooses that line's shape, kept separate from the JSX so the awkward case has
 * somewhere to be tested.
 *
 * The awkward case is `locking`: the lock instant has passed on this device
 * while the backend still reports the session writable. The clock ticks locally
 * every second, but the capability flags only change when Convex re-answers, so
 * the two disagree for a moment on every lock. Neither "locks in ..." nor "is
 * locked" is true in that window, and reusing the countdown string there put
 * the word "Locked" inside the sentence: "Sprint locks in Locked".
 *
 * It resolves to `locking` rather than `locked` because picks genuinely still
 * submit until the backend says otherwise, and telling a player they missed a
 * deadline they have not missed is the worse failure.
 */
export function getSessionClockState(
  session: DashboardSessionState | null,
  now: number,
): SessionClockState | null {
  if (!session) {
    return null;
  }

  const isOpen = session.canCreate || session.canEdit;

  if (isOpen && session.lockAt != null) {
    const msRemaining = session.lockAt - now;
    return msRemaining > 0
      ? { kind: 'countdown', msRemaining }
      : { kind: 'locking' };
  }

  return session.hasResult ? { kind: 'results' } : { kind: 'locked' };
}

/**
 * Where the focus goes when an arrow, Home or End is pressed on the session tab
 * strip, or null when the key is not one the strip handles.
 *
 * Split out from the component because the strip's keyboard behaviour is the
 * only thing making it reachable at all: it uses a roving tabindex, so every
 * chip but the selected one is `tabIndex={-1}` and Tab alone can never land on
 * them. The DOM half (moving focus, selecting) is three lines; this is the part
 * with the edge cases, so it is the part that gets tested.
 *
 * Arrows wrap. The pattern permits either, and the strip scrolls horizontally,
 * so the far end is often off screen and wrapping is the short way to it.
 */
export function nextSessionTabIndex(
  key: string,
  current: number,
  count: number,
): number | null {
  if (count === 0 || current < 0 || current >= count) {
    return null;
  }
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    default:
      return null;
  }
}
