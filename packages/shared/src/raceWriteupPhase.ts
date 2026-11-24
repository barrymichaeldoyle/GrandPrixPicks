/**
 * Where a race write-up is in its weekend, from the race's status and session
 * times. Shared because the news API (`apps/backend/convex/newsApi.ts`) links
 * a story to its write-up only while the page shows the weekend's news, which
 * is while this says the page is live. The web app's copy for each phase stays
 * in `apps/web/src/lib/raceWriteupPhase.ts`.
 */
export type RaceWriteupPhase =
  | 'preview'
  | 'evidence'
  | 'race-picks'
  | 'picks-locked'
  | 'finished'
  | 'cancelled';

export type RaceWriteupPhaseRace = {
  status: 'upcoming' | 'locked' | 'finished' | 'cancelled';
  fp1StartAt?: number;
  qualiLockAt?: number;
  qualiStartAt?: number;
  predictionLockAt: number;
  raceStartAt: number;
};

/**
 * The reader's job on an editorial race write-up.
 *
 * The database status wins for terminal states. Before then, session lock
 * times divide the weekend without pretending an on-track result is already
 * available. In particular, crossing the scheduled race start means picks are
 * locked; only a published race result moves the page to `finished`.
 */
export function getRaceWriteupPhase(
  race: RaceWriteupPhaseRace,
  now: number,
): RaceWriteupPhase {
  if (race.status === 'cancelled') {
    return 'cancelled';
  }
  if (race.status === 'finished') {
    return 'finished';
  }

  const raceLockAt = race.predictionLockAt || race.raceStartAt;
  if (now >= raceLockAt) {
    return 'picks-locked';
  }

  const qualifyingLockAt = race.qualiLockAt ?? race.qualiStartAt;
  if (qualifyingLockAt !== undefined && now >= qualifyingLockAt) {
    return 'race-picks';
  }

  if (race.fp1StartAt !== undefined && now >= race.fp1StartAt) {
    return 'evidence';
  }

  return 'preview';
}

export function isRaceWriteupLive(phase: RaceWriteupPhase): boolean {
  return phase === 'preview' || phase === 'evidence' || phase === 'race-picks';
}
