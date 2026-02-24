/**
 * Shared session type and order for quali, sprint quali, sprint, and race.
 * Sprint quali and sprint appear before main quali in the tab order.
 */

export type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

export const SESSION_LABELS: Record<SessionType, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Quali',
  sprint: 'Sprint',
  race: 'Race',
};

export const SESSION_LABELS_SHORT: Record<SessionType, string> = {
  quali: 'Quali',
  sprint_quali: 'SQ',
  sprint: 'Sprint',
  race: 'Race',
};

/** Session order for a sprint weekend (sprint quali → sprint → quali → race). */
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
