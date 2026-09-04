import { describe, expect, it } from 'vitest';

import type { PracticeResults } from './practiceSessions';
import {
  latestPracticeResult,
  practiceSessionFact,
  publishedPracticeSessions,
} from './practiceSessions';

function session(
  sessionType: 'fp1' | 'fp2' | 'fp3',
  driverCount: number,
): PracticeResults[number] {
  return {
    sessionType,
    publishedAt: 1_000,
    entries: Array.from({ length: driverCount }, (_, index) => ({
      driverNumber: index + 1,
      code: `D${String(index + 1).padStart(2, '0')}`,
      displayName: `Driver ${index + 1} (${sessionType})`,
      team: 'McLaren',
      position: index + 1,
      bestLapSeconds: 80 + index,
      gapToLeaderSeconds: index === 0 ? undefined : index,
      lapCount: 20,
      isReserve: false,
    })),
  };
}

describe('publishedPracticeSessions', () => {
  it('orders sessions the way they ran, whatever the query returned', () => {
    const sessions = publishedPracticeSessions([
      session('fp3', 20),
      session('fp1', 20),
      session('fp2', 20),
    ]);
    expect(sessions.map((result) => result.sessionType)).toEqual([
      'fp1',
      'fp2',
      'fp3',
    ]);
  });

  it('treats an empty classification as unpublished', () => {
    const sessions = publishedPracticeSessions([
      session('fp1', 20),
      session('fp2', 0),
    ]);
    expect(sessions.map((result) => result.sessionType)).toEqual(['fp1']);
  });

  it('answers for a query that has not resolved', () => {
    expect(publishedPracticeSessions(undefined)).toEqual([]);
  });
});

describe('latestPracticeResult', () => {
  it('prefers the newest session regardless of array order', () => {
    const results = [
      session('fp1', 20),
      session('fp3', 20),
      session('fp2', 20),
    ];
    expect(latestPracticeResult(results)?.sessionType).toBe('fp3');
  });

  it('returns null when nothing has been published', () => {
    expect(latestPracticeResult([])).toBeNull();
  });
});

describe('practiceSessionFact', () => {
  it('names the session and whoever topped it', () => {
    expect(practiceSessionFact(session('fp2', 20))).toBe(
      'FP2 · Driver 1 (fp2) fastest',
    );
  });

  it('falls back to the session when no leader is classified', () => {
    const withoutLeader = session('fp1', 3);
    withoutLeader.entries = withoutLeader.entries.slice(1);
    expect(practiceSessionFact(withoutLeader)).toBe('FP1');
  });
});
