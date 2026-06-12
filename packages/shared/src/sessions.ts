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
