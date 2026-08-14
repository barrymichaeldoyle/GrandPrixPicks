import type { Doc } from '@convex-generated/dataModel';

import type { SessionType } from './sessions';
import { getSessionsForWeekend } from './sessions';

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

/**
 * Lock time of the earliest weekend session that hasn't locked yet. Falls back
 * to the race lock once every session is locked. Countdowns shown while picks
 * are open ("Xh to predict" / "until lock") must use this, not
 * `predictionLockAt` — the race session locks last, so counting down to it
 * overstates how long users have to get their quali/sprint picks in.
 */
export function getNextSessionLockAt(
  race: Doc<'races'>,
  now: number = Date.now(),
): number {
  for (const session of getSessionsForWeekend(!!race.hasSprint)) {
    const lockAt = getRaceSessionLockAt(race, session);
    if (lockAt > now) {
      return lockAt;
    }
  }
  return race.predictionLockAt;
}

type RaceSessionTimesShape = Pick<
  Doc<'races'>,
  | 'hasSprint'
  | 'qualiStartAt'
  | 'sprintQualiStartAt'
  | 'sprintStartAt'
  | 'raceStartAt'
>;

export interface WeekendSessionStart {
  type: SessionType;
  startAt: number;
}

/**
 * The weekend's sessions with their own scheduled start times, in track
 * order. Sessions without a scheduled start (e.g. quali times not announced
 * yet) are omitted — unlike `getRaceSessionStartAt`, this never falls back to
 * the race start. Label via `SESSION_LABELS[entry.type]` at the call site.
 */
export function getWeekendSessionStarts(
  race: RaceSessionTimesShape,
): WeekendSessionStart[] {
  const startAtBySession: Record<SessionType, number | undefined> = {
    quali: race.qualiStartAt,
    sprint_quali: race.sprintQualiStartAt,
    sprint: race.sprintStartAt,
    race: race.raceStartAt,
  };
  return getSessionsForWeekend(!!race.hasSprint).flatMap((type) => {
    const startAt = startAtBySession[type];
    return startAt === undefined ? [] : [{ type, startAt }];
  });
}

export const PRACTICE_LABELS = {
  fp1: 'Practice 1',
  fp2: 'Practice 2',
  fp3: 'Practice 3',
} as const;

type PracticeType = keyof typeof PRACTICE_LABELS;

export interface WeekendPracticeStart {
  type: PracticeType;
  startAt: number;
}

type RacePracticeTimesShape = Pick<
  Doc<'races'>,
  'fp1StartAt' | 'fp2StartAt' | 'fp3StartAt'
>;

/**
 * The weekend's free practice sessions, in track order.
 *
 * Deliberately separate from `getWeekendSessionStarts`. Practice is not a
 * `SessionType`: there is nothing to pick, nothing to lock and nothing to
 * score, and every consumer of that function assumes all three. Folding
 * practice in there would put FP1 in front of the prediction UI.
 *
 * Sprint weekends only run FP1, so the absent entries simply drop out.
 */
export function getWeekendPracticeStarts(
  race: RacePracticeTimesShape,
): WeekendPracticeStart[] {
  const startAtByPractice: Record<PracticeType, number | undefined> = {
    fp1: race.fp1StartAt,
    fp2: race.fp2StartAt,
    fp3: race.fp3StartAt,
  };
  return (Object.keys(PRACTICE_LABELS) as PracticeType[]).flatMap((type) => {
    const startAt = startAtByPractice[type];
    return startAt === undefined ? [] : [{ type, startAt }];
  });
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
