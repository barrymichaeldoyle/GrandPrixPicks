export type RaceWriteupPhase =
  | 'preview'
  | 'evidence'
  | 'race-picks'
  | 'picks-locked'
  | 'finished'
  | 'cancelled';

type RaceWriteupPhaseRace = {
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

export function raceWriteupPhaseLabel(phase: RaceWriteupPhase): string {
  switch (phase) {
    case 'preview':
      return 'Weekend preview';
    case 'evidence':
      return 'Practice';
    case 'race-picks':
      return 'Race picks';
    case 'picks-locked':
      return 'Picks locked';
    case 'finished':
      return 'Results';
    case 'cancelled':
      return 'Race called off';
  }
}

export function raceWriteupPrimaryAction(
  phase: RaceWriteupPhase,
  venueName: string,
  compact = false,
): string {
  switch (phase) {
    case 'preview':
    case 'evidence':
      return compact ? 'Make your picks' : `Make your ${venueName} picks`;
    case 'race-picks':
      return 'Make your race picks';
    case 'picks-locked':
      return 'See your picks';
    case 'finished':
      return compact ? 'See results' : `See ${venueName} results`;
    case 'cancelled':
      return 'See race details';
  }
}

export function raceWriteupHeroSummary(
  phase: RaceWriteupPhase,
  raceName: string,
  liveSummary: string,
): string {
  switch (phase) {
    case 'preview':
    case 'evidence':
    case 'race-picks':
      return liveSummary;
    case 'picks-locked':
      return `${raceName} picks are locked. Results will appear on the race page after they are published.`;
    case 'finished':
      return `${raceName} is complete. Official results and scores are on the race page.`;
    case 'cancelled':
      return `${raceName} was called off.`;
  }
}
