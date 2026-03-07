import type { SessionType } from '../../lib/sessions';
import { getSessionsForWeekend } from '../../lib/sessions';
import type { WeekendCardData } from './types';

export type CardDisplayState =
  | 'not_yet_open'
  | 'open_no_picks_auth'
  | 'open_no_picks_unauth'
  | 'open_has_picks'
  | 'partially_locked'
  | 'fully_locked'
  | 'partially_scored'
  | 'fully_scored'
  | 'missed_with_results'
  | 'hidden_upcoming';

type DeriveCardStateInput = {
  data: WeekendCardData;
  isSignedIn: boolean;
  isOwner: boolean;
  isNextRace: boolean;
};

export function deriveCardState({
  data,
  isSignedIn,
  isOwner,
  isNextRace,
}: DeriveCardStateInput): CardDisplayState {
  const sessions = getSessionsForWeekend(data.hasSprint);
  const sessionEntries = sessions
    .map((s) => ({ type: s, data: data.sessions[s] }))
    .filter(
      (e): e is { type: SessionType; data: NonNullable<typeof e.data> } =>
        e.data !== null,
    );

  const hasPicks = sessionEntries.some((e) => e.data.picks.length > 0);
  const hasAnyResults = sessionEntries.some((e) => e.data.hasResults);
  const allHidden = sessionEntries.every((e) => e.data.isHidden);
  const hasLockedSessions = sessionEntries.some((e) => e.data.isLocked);
  const allLocked =
    sessionEntries.length > 0 && sessionEntries.every((e) => e.data.isLocked);
  const scoredSessions = sessionEntries.filter((e) => e.data.points !== null);
  const allScored =
    hasAnyResults &&
    scoredSessions.length ===
      sessionEntries.filter((e) => e.data.hasResults).length &&
    scoredSessions.length > 0;

  // Not the next race and still upcoming
  if (data.raceStatus === 'upcoming' && !isNextRace) {
    return 'not_yet_open';
  }

  // Viewing someone else's upcoming picks that are all hidden
  if (!isOwner && data.raceStatus === 'upcoming' && allHidden && hasPicks) {
    return 'hidden_upcoming';
  }

  // Results exist but user didn't make picks
  if (hasAnyResults && !hasPicks) {
    return 'missed_with_results';
  }

  // All sessions scored
  if (allScored && data.raceStatus === 'finished') {
    return 'fully_scored';
  }

  // Some sessions scored
  if (scoredSessions.length > 0) {
    return 'partially_scored';
  }

  // All locked, no results yet
  if (allLocked) {
    return 'fully_locked';
  }

  // Some locked, some still open
  if (hasLockedSessions && hasPicks) {
    return 'partially_locked';
  }

  // Next race, signed in, has picks
  if (isNextRace && hasPicks) {
    return 'open_has_picks';
  }

  // Next race, signed in, no picks
  if (isNextRace && isSignedIn && !hasPicks) {
    return 'open_no_picks_auth';
  }

  // Next race, not signed in
  if (isNextRace && !isSignedIn) {
    return 'open_no_picks_unauth';
  }

  // Fallback
  return 'not_yet_open';
}

export const BORDER_LEFT_COLORS: Record<CardDisplayState, string> = {
  not_yet_open: '',
  open_no_picks_auth: 'rounded-l-sm border-l-8 border-l-accent/30',
  open_no_picks_unauth: 'rounded-l-sm border-l-8 border-l-accent/30',
  open_has_picks: 'rounded-l-sm border-l-8 border-l-accent/30',
  partially_locked: 'rounded-l-sm border-l-8 border-l-accent/30',
  fully_locked: 'rounded-l-sm border-l-8 border-l-warning/30',
  partially_scored: 'rounded-l-sm border-l-8 border-l-accent/30',
  fully_scored: 'rounded-l-sm border-l-8 border-l-success/30',
  missed_with_results: 'rounded-l-sm border-l-8 border-l-success/30',
  hidden_upcoming: '',
};

type WeekendSummaryStats = {
  exact: number;
  close: number;
  inTop5: number;
  miss: number;
  hasScoredSessions: boolean;
};

export function getWeekendSummary(
  data: WeekendCardData,
  sessions: ReadonlyArray<SessionType>,
): WeekendSummaryStats {
  let exact = 0;
  let close = 0;
  let inTop5 = 0;
  let miss = 0;
  let hasScoredSessions = false;

  for (const session of sessions) {
    const sessionData = data.sessions[session];
    if (!sessionData?.breakdown) {
      continue;
    }
    hasScoredSessions = true;
    for (const item of sessionData.breakdown) {
      if (item.points === 5) {
        exact++;
      } else if (item.points === 3) {
        close++;
      } else if (item.points === 1) {
        inTop5++;
      } else {
        miss++;
      }
    }
  }

  return { exact, close, inTop5, miss, hasScoredSessions };
}
