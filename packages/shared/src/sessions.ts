export type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

/** UI-friendly labels used in web tabs and compact headings. */
export const SESSION_LABELS: Record<SessionType, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Quali',
  sprint: 'Sprint',
  race: 'Race',
};

/** Full labels used in notifications and long-form copy. */
export const SESSION_LABELS_FULL: Record<SessionType, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

export const SESSION_LABELS_SHORT: Record<SessionType, string> = {
  quali: 'Quali',
  sprint_quali: 'SQ',
  sprint: 'Sprint',
  race: 'Race',
};

/** Session order for a sprint weekend (sprint quali -> sprint -> quali -> race). */
const SESSIONS_SPRINT_WEEKEND: ReadonlyArray<SessionType> = [
  'sprint_quali',
  'sprint',
  'quali',
  'race',
];

/** Session order for a non-sprint weekend. */
const SESSIONS_REGULAR: ReadonlyArray<SessionType> = ['quali', 'race'];

/** Returns the session order for a weekend. */
export function getSessionsForWeekend(
  hasSprint: boolean,
): ReadonlyArray<SessionType> {
  return hasSprint ? SESSIONS_SPRINT_WEEKEND : SESSIONS_REGULAR;
}

/**
 * Sessions earlier in the weekend that don't have published results yet.
 * Results must be entered in weekend order (e.g. quali before race), so a
 * non-empty return value means publishing `sessionType` would be out of order.
 */
export function getMissingEarlierSessions(
  hasSprint: boolean,
  sessionType: SessionType,
  publishedSessions: ReadonlyArray<SessionType>,
): SessionType[] {
  const order = getSessionsForWeekend(hasSprint);
  const index = order.indexOf(sessionType);
  if (index === -1) {
    return [];
  }
  return order
    .slice(0, index)
    .filter((session) => !publishedSessions.includes(session));
}

type RaceWeekendLocks = {
  hasSprint?: boolean;
  qualiLockAt?: number;
  sprintQualiLockAt?: number;
};

/**
 * Lock time of the first session of a race weekend. Sprint weekends start
 * with sprint qualifying; regular weekends start with qualifying.
 */
export function getFirstSessionLockAt(
  race: RaceWeekendLocks,
): number | undefined {
  return race.hasSprint
    ? (race.sprintQualiLockAt ?? race.qualiLockAt)
    : race.qualiLockAt;
}

/**
 * Whether a race should appear in the leaderboard race-weekend selector, on
 * web and mobile alike. Includes finished and locked races, plus upcoming
 * races whose first session has already locked (mid-weekend, before the race
 * itself locks). Cancelled races are always excluded.
 */
export function isRaceSelectableForLeaderboard(
  race: RaceWeekendLocks & { status: string },
  now: number = Date.now(),
): boolean {
  if (race.status === 'cancelled') {
    return false;
  }
  if (race.status === 'finished' || race.status === 'locked') {
    return true;
  }
  const firstSessionLockAt = getFirstSessionLockAt(race);
  return firstSessionLockAt !== undefined && now >= firstSessionLockAt;
}
