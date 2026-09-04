import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';

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
