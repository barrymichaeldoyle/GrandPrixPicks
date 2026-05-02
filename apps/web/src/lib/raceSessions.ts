import type { Doc } from '@convex-generated/dataModel';

import type { SessionType } from './sessions';

export function getRaceSessionLockAt(
  race: Doc<'races'>,
  session: SessionType,
): number {
  switch (session) {
    case 'quali':
      return race.qualiLockAt ?? 0;
    case 'sprint_quali':
      return race.sprintQualiLockAt ?? 0;
    case 'sprint':
      return race.sprintLockAt ?? 0;
    case 'race':
      return race.predictionLockAt;
  }
}

export function getRaceSessionStartAt(
  race: Doc<'races'>,
  session: SessionType,
): number {
  switch (session) {
    case 'quali':
      return race.qualiStartAt ?? race.raceStartAt;
    case 'sprint_quali':
      return race.sprintQualiStartAt ?? race.raceStartAt;
    case 'sprint':
      return race.sprintStartAt ?? race.raceStartAt;
    case 'race':
      return race.raceStartAt;
  }
}

type RaceWeekendShape = Pick<
  Doc<'races'>,
  'hasSprint' | 'qualiLockAt' | 'sprintQualiLockAt'
>;

/**
 * Lock time of the first session of a race weekend. Sprint weekends start
 * with sprint qualifying; regular weekends start with qualifying.
 */
export function getFirstSessionLockAt(
  race: RaceWeekendShape,
): number | undefined {
  return race.hasSprint
    ? (race.sprintQualiLockAt ?? race.qualiLockAt)
    : race.qualiLockAt;
}

/**
 * Whether a race should appear in the leaderboard race-weekend dropdown.
 * Includes finished and locked races, plus upcoming races whose first
 * session has already locked (mid-weekend, before the race itself locks).
 * Cancelled races are always excluded.
 */
export function isRaceSelectableForLeaderboard(
  race: Pick<Doc<'races'>, 'status'> & RaceWeekendShape,
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
