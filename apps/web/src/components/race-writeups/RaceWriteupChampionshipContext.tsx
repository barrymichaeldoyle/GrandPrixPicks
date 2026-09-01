import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { reviewedStamp } from '@/lib/lastReviewed';
import { getRaceWriteup } from '@/lib/raceWriteups';

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
type SeasonRace = FunctionReturnType<
  typeof api.races.listCurrentSeason
>['races'][number];

export function RaceWriteupChampionshipContext({
  championship,
  races,
  thisRound,
  venueName,
}: {
  championship: Championship;
  races: readonly SeasonRace[];
  thisRound: number;
  venueName: string;
}) {
  const drivers = championship.drivers.slice(0, 6);
  const leader = drivers[0];
  const second = drivers[1];
  if (!leader || !second) {
    return null;
  }

  const gap = leader.points - second.points;
  const pendingRaces = races
    .filter(
      (race) =>
        race.round > championship.roundsScored &&
        race.round < thisRound &&
        race.status !== 'cancelled',
    )
    .sort((a, b) => a.round - b.round);

  return (
    <section className="py-8 sm:py-16" aria-labelledby="championship-context">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <h2
            id="championship-context"
            className="font-title text-2xl font-medium text-text"
          >
            Championship standings
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            After {championship.roundsScored} rounds, {leader.displayName} leads
            the drivers&rsquo; table by {gap} {gap === 1 ? 'point' : 'points'}{' '}
            from {second.displayName}.
            {pendingRaces.length > 0 ? (
              <>
                {' '}
                The <RaceList races={pendingRaces} /> still{' '}
                {pendingRaces.length === 1 ? 'has' : 'have'} to be scored, so
                this table will change before {venueName}.
              </>
            ) : null}
          </p>
          <Link
            to="/f1-standings"
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            View full 2026 standings{' '}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="border border-border bg-surface">
          <div className="flex justify-between border-b border-border px-4 py-3">
            <h3 className="font-title font-medium text-text">Drivers</h3>
            <span className="gpp-mono text-xs text-text-muted">
              AFTER {championship.roundsScored} ROUNDS
            </span>
          </div>
          <ol aria-label="Top six drivers">
            {drivers.map((driver) => (
              <li
                key={driver.driverId}
                className="grid grid-cols-[1.25rem_auto_1fr_auto] items-center gap-2 border-b border-border/60 px-4 py-2.5 last:border-b-0"
              >
                <span className="gpp-mono text-sm text-text-muted">
                  {driver.position}
                </span>
                <DriverBadge
                  code={driver.code}
                  team={driver.team}
                  displayName={driver.displayName}
                  number={driver.number}
                  nationality={driver.nationality}
                  size="sm"
                  prerenderTooltip={false}
                />
                <span className="min-w-0 truncate text-sm text-text">
                  {driver.displayName}
                </span>
                <span className="gpp-mono text-sm text-text">
                  {driver.points} PTS
                </span>
              </li>
            ))}
          </ol>
          <p className="border-t border-border px-4 py-3 text-xs leading-5 text-text-muted">
            Scored through round {championship.roundsScored}
            {championship.lastUpdated
              ? `, updated ${reviewedStamp(championship.lastUpdated)}`
              : ''}
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function RaceList({ races }: { races: readonly SeasonRace[] }) {
  return races.map((race, index) => (
    <span key={race.slug}>
      {index > 0 ? (index === races.length - 1 ? ' and the ' : ', the ') : null}
      <RaceNameLink race={race} />
    </span>
  ));
}

function RaceNameLink({ race }: { race: SeasonRace }) {
  const writeup = getRaceWriteup(race.slug);
  if (writeup) {
    return (
      <Link
        to={writeup.to}
        className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
      >
        {race.name}
      </Link>
    );
  }

  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: race.slug }}
      className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {race.name}
    </Link>
  );
}
