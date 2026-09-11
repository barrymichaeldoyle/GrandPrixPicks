import type { Id } from '@convex-generated/dataModel';

import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';

import { DeferredRaceWriteupPicks } from './DeferredRaceWriteupPicks';
import { RaceWriteupClosingPanel } from './RaceWriteupClosingPanel';
import { RaceWriteupNextRound } from './RaceWriteupNextRound';

/**
 * How a write-up ends: the picks form while they can still be made, the
 * closing panel (and the next round) once they cannot.
 *
 * `nextRace` is optional because a finished page that already linked the
 * next round further up should not print it twice.
 */
export function RaceWriteupFinish({
  isLive,
  phase,
  raceId,
  round,
  season,
  raceSlug,
  venueName,
  nextRace,
}: {
  isLive: boolean;
  phase: RaceWriteupPhase;
  raceId: Id<'races'>;
  round: number;
  season: number;
  raceSlug: string;
  venueName: string;
  nextRace?: { slug: string; name: string; round: number } | null;
}) {
  if (isLive) {
    return (
      <DeferredRaceWriteupPicks
        phase={phase}
        raceId={raceId}
        round={round}
        season={season}
        raceSlug={raceSlug}
        venueName={venueName}
      />
    );
  }

  return (
    <>
      <RaceWriteupClosingPanel
        phase={phase}
        raceId={raceId}
        raceSlug={raceSlug}
        venueName={venueName}
      />
      {nextRace !== undefined ? (
        <RaceWriteupNextRound nextRace={nextRace} />
      ) : null}
    </>
  );
}
