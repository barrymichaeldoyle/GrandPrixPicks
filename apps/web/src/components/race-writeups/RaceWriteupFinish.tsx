import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';

import { primaryButtonStyles } from '@/components/Button/Button';

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
  // Only the next race on the calendar takes picks. A write-up published
  // weeks ahead is live long before its round opens, and the embedded picker
  // used to let a reader fill in a whole weekend that the backend then refused:
  // a new sign-up from search made eleven Sepang duels on 14 September and hit
  // six save failures in a row. `nextRace` is loader data, so this is in the
  // SSR HTML too.
  if (isLive && nextRace && nextRace.slug !== raceSlug) {
    return <PicksNotOpenYet venueName={venueName} nextRace={nextRace} />;
  }

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

function PicksNotOpenYet({
  venueName,
  nextRace,
}: {
  venueName: string;
  nextRace: { slug: string; name: string };
}) {
  return (
    <section
      aria-labelledby="race-writeup-picks-not-open-heading"
      className="rounded-sm bg-surface px-5 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-7"
    >
      <div className="max-w-xl">
        <h2
          id="race-writeup-picks-not-open-heading"
          className="font-title text-xl font-medium text-text"
        >
          {venueName} picks open when the {nextRace.name} starts
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Only the next race on the calendar takes picks, and that is the{' '}
          {nextRace.name}.
        </p>
      </div>
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: nextRace.slug }}
        className={`${primaryButtonStyles('md')} mt-5 shrink-0 sm:mt-0`}
      >
        Make your {nextRace.name} picks
      </Link>
    </section>
  );
}
