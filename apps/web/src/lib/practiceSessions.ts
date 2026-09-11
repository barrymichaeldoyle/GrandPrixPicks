import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';

import {
  getWeekendPracticeStarts,
  getWeekendSessionStarts,
} from './raceSessions';
import { SESSION_LABELS_FULL } from './sessions';

export type PracticeResults = FunctionReturnType<
  typeof api.practiceResults.getPracticeResultsForRace
>;
export type PracticeResult = PracticeResults[number];
export type PracticeSessionType = PracticeResult['sessionType'];

export const PRACTICE_SESSION_LABELS = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
} as const;

/** Modal title: the session named in full, then what the sheet is. */
export function practiceResultsHeading(session: PracticeSessionType): string {
  const name = {
    fp1: 'Free Practice 1',
    fp2: 'Free Practice 2',
    fp3: 'Free Practice 3',
  }[session];
  return `${name} results`;
}

/** Friday morning to Saturday morning, the order the sessions ran in. */
const SESSION_ORDER = ['fp1', 'fp2', 'fp3'] as const;

/**
 * Published sessions in the order they ran, so a list of them reads FP1, FP2,
 * FP3 however the query returned them. A session with no entries is not
 * published as far as a reader is concerned.
 */
export function publishedPracticeSessions(
  results: PracticeResults | undefined,
): PracticeResult[] {
  if (!results) {
    return [];
  }
  return SESSION_ORDER.flatMap((sessionType) => {
    const result = results.find(
      (candidate) =>
        candidate.sessionType === sessionType && candidate.entries.length > 0,
    );
    return result ? [result] : [];
  });
}

/**
 * The newest published session: FP3 wins over FP2 wins over FP1.
 *
 * It is what a surface leads with, even where every session is shown, because
 * "what happened while I was away" is the most recent one.
 */
export function latestPracticeResult(
  results: PracticeResults | undefined,
): PracticeResult | null {
  return publishedPracticeSessions(results).at(-1) ?? null;
}

/** The header line a surface leads with: which session, and who topped it. */
export function practiceSessionFact(result: PracticeResult): string {
  const label = PRACTICE_SESSION_LABELS[result.sessionType];
  const leader = result.entries.find((entry) => entry.position === 1);
  return leader ? `${label} · ${leader.displayName} fastest` : label;
}

/**
 * Start times and lengths for the weekend's remaining sessions. Practice
 * lengths match the weather hour-window (60 / 50 / 75 / 120 minutes).
 */
export type TrackSessionSchedule = {
  /** Weekend name, when the schedule is the race document itself. */
  name?: string;
  hasSprint?: boolean;
  fp1StartAt?: number;
  fp2StartAt?: number;
  fp3StartAt?: number;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  qualiStartAt?: number;
  raceStartAt: number;
};

export type NextTrackSession = {
  label: string;
  startAt: number;
  status: 'upcoming' | 'live';
  /** Set when the next session is still a free-practice hour. */
  practiceSession?: PracticeSessionType;
};

const MINUTE = 60_000;
const TRACK_SESSION_DURATION_MS = {
  fp1: 60 * MINUTE,
  fp2: 60 * MINUTE,
  fp3: 60 * MINUTE,
  sprint_quali: 50 * MINUTE,
  sprint: 60 * MINUTE,
  quali: 75 * MINUTE,
  race: 120 * MINUTE,
} as const;

/**
 * The next session a practice classification should mention: still to start,
 * or currently running. Published practice is skipped; a session whose window
 * has closed without times is skipped rather than called underway.
 */
export function nextTrackSession(
  race: TrackSessionSchedule | null | undefined,
  publishedPractice: readonly PracticeSessionType[],
  now: number,
): NextTrackSession | null {
  if (!race) {
    return null;
  }
  const published = new Set(publishedPractice);
  const sessions = [
    ...getWeekendPracticeStarts(race).map((entry) => ({
      label: PRACTICE_SESSION_LABELS[entry.type],
      startAt: entry.startAt,
      durationMs: TRACK_SESSION_DURATION_MS[entry.type],
      skip: published.has(entry.type),
      practiceSession: entry.type,
    })),
    ...getWeekendSessionStarts(race).map((entry) => ({
      label: SESSION_LABELS_FULL[entry.type],
      startAt: entry.startAt,
      durationMs: TRACK_SESSION_DURATION_MS[entry.type],
      skip: false,
      practiceSession: undefined,
    })),
  ].sort((a, b) => a.startAt - b.startAt);

  for (const session of sessions) {
    if (session.skip) {
      continue;
    }
    if (now < session.startAt) {
      return {
        label: session.label,
        startAt: session.startAt,
        status: 'upcoming',
        practiceSession: session.practiceSession,
      };
    }
    if (now < session.startAt + session.durationMs) {
      return {
        label: session.label,
        startAt: session.startAt,
        status: 'live',
        practiceSession: session.practiceSession,
      };
    }
  }
  return null;
}
