import { api } from '@convex-generated/api';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Flag, Timer } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { NoticeCard } from '@/components/NoticeCard';
import { PageHeader } from '@/components/PageHeader';
import { RankDelta } from '@/components/RankDelta';
import { setChampionshipCacheHeaders } from '@/lib/championshipCacheHeaders';
import { formatDateLong, type UserDateSettings } from '@/lib/date';
import { displayTeamName } from '@/lib/display';
import { routeQuery } from '@/lib/routeQuery';
import { pageMeta, siteConfig } from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

export const Route = createFileRoute('/f1-qualifying-standings')({
  component: F1QualifyingStandingsPage,
  loader: async ({ context }) => {
    const [standings] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.qualifyingChampionship.getQualifyingChampionship, {}),
      ),
      setChampionshipCacheHeaders(),
    ]);
    return { standings };
  },
  head: ({ loaderData }) => {
    const standings = loaderData?.standings;
    const season = standings?.season;
    const leader = standings?.drivers[0];
    const title = season
      ? `${season} F1 Qualifying Standings: The Saturday Championship`
      : 'F1 Qualifying Standings: The Saturday Championship';
    // Kept short enough that the longest driver name on the grid still leaves
    // it inside the 160-character SERP limit, like `/f1-standings`.
    const description = leader
      ? `${leader.displayName} leads the ${season} F1 qualifying championship: the season scored on qualifying alone, with every driver's gap to the real standings.`
      : `The Formula 1 season scored on qualifying results only: drivers' and constructors' tables, with every driver's gap to the real championship standings.`;

    const scripts: { type: string; children: string }[] = [];
    if (standings && standings.drivers.length > 0) {
      const pageUrl = `${siteConfig.url}/f1-qualifying-standings`;
      scripts.push({
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': pageUrl,
              url: pageUrl,
              name: `${standings.season} F1 Qualifying Championship`,
              description,
              ...(standings.lastUpdated
                ? {
                    dateModified: new Date(standings.lastUpdated).toISOString(),
                  }
                : {}),
            },
            {
              '@type': 'ItemList',
              name: `${standings.season} F1 Qualifying Championship Standings`,
              description: `Formula 1 ${standings.season} season standings scored on qualifying results only.`,
              url: pageUrl,
              numberOfItems: standings.drivers.length,
              itemListOrder: 'https://schema.org/ItemListOrderAscending',
              itemListElement: standings.drivers.map((driver) => ({
                '@type': 'ListItem',
                position: driver.qualifyingPosition,
                name: driver.displayName,
                item: {
                  '@type': 'Person',
                  name: driver.displayName,
                  ...(driver.team
                    ? {
                        memberOf: {
                          '@type': 'SportsTeam',
                          name: driver.team,
                        },
                      }
                    : {}),
                },
              })),
            },
          ],
        }),
      });
    }

    return {
      ...pageMeta({
        title,
        description,
        path: '/f1-qualifying-standings',
        image: `${siteConfig.url}/og/qualifying-championship`,
        imageAlt: season
          ? `${season} Formula 1 qualifying championship standings`
          : 'Formula 1 qualifying championship standings',
      }),
      scripts,
    };
  },
});

/**
 * Pinned to a fixed locale and time zone, like `/f1-standings`: this document
 * is identical for every crawler and signed-out visitor, so a device-default
 * date would render one way on the server and another in the browser.
 */
const LAST_UPDATED_FORMAT: UserDateSettings = {
  locale: 'en-GB',
  timezone: 'UTC',
};

function teamColor(team: string | null): string {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

/** "P4 in qualifying, P8 in the championship" — the fact both surfaces state. */
function positionsSentence(entry: {
  displayName: string;
  qualifyingPosition: number;
  championshipPosition: number;
}): string {
  return `${entry.displayName}: P${entry.qualifyingPosition} in the qualifying championship, P${entry.championshipPosition} in the World Championship.`;
}

/**
 * The secondary line under a driver's name on phones, carrying the Team and
 * Poles columns that only become columns once the viewport can afford them.
 */
function driverSubline(driver: { team: string | null; wins: number }): string {
  const parts = [driver.team ? displayTeamName(driver.team) : '—'];
  if (driver.wins > 0) {
    parts.push(`${driver.wins} ${driver.wins === 1 ? 'pole' : 'poles'}`);
  }
  return parts.join(' · ');
}

type Mover = {
  driverId: string;
  code: string;
  displayName: string;
  team: string | null;
  nationality: string | null;
  number: number | null;
  qualifyingPosition: number;
  championshipPosition: number;
  delta: number;
};

/**
 * One driver whose two championship positions disagree.
 *
 * The delta glyph is decorative here: the line under it states both positions
 * in full, so a screen reader gets the fact rather than "up 4 places" with no
 * indication of up from what.
 */
function MoverCard({ mover }: { mover: Mover }) {
  return (
    <li className="flex items-center gap-3 border-t border-border/70 py-3 first:border-t-0 sm:border-t sm:first:border-t">
      <span aria-hidden className="shrink-0">
        {/* The badge already carries the team colour, which is why these rows
            have no colour bar of their own: it is the same mechanism the two
            tables below use, at the same 3px.

            `tooltipFocusable={false}` because this whole span is aria-hidden:
            a focusable trigger inside it would be reachable by keyboard and
            invisible to a screen reader at the same time. The sr-only sentence
            below carries what the badge shows. */}
        <DriverBadge
          code={mover.code}
          team={mover.team}
          displayName={mover.displayName}
          number={mover.number}
          nationality={mover.nationality}
          size="sm"
          prerenderTooltip={false}
          tooltipFocusable={false}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-medium text-text">
            {mover.displayName}
          </span>
          <span aria-hidden className="shrink-0">
            <RankDelta delta={mover.delta} />
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-text-muted">
          <span aria-hidden>
            P{mover.qualifyingPosition} qualifying · P
            {mover.championshipPosition} championship
          </span>
          <span className="sr-only">{positionsSentence(mover)}</span>
        </span>
      </span>
    </li>
  );
}

function F1QualifyingStandingsPage() {
  const { standings: initialStandings } = Route.useLoaderData();
  // Also the observer that keeps the loader's cache entry subscribed; without
  // it the entry would sit unwatched behind an infinite stale time.
  const { data: liveStandings } = useQuery(
    routeQuery(api.qualifyingChampionship.getQualifyingChampionship, {}),
  );
  const standings = liveStandings ?? initialStandings;
  const { constructors, drivers, lastUpdated, movers, roundsScored, season } =
    standings;
  const hasResults = drivers.length > 0 && roundsScored > 0;
  const leader = drivers[0];

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          eyebrow="Formula 1"
          title={`${season} F1 Qualifying Championship`}
          subtitle={
            <>
              The {season} season scored on qualifying alone. Every qualifying
              session pays the Grand Prix points table and every sprint
              qualifying pays the sprint table, so the standings show one-lap
              pace with Sunday taken out.{' '}
              {hasResults && leader ? (
                <>
                  {leader.displayName} leads on {leader.qualifyingPoints} points
                  after {roundsScored} {roundsScored === 1 ? 'round' : 'rounds'}
                  , and is P{leader.championshipPosition} in the real
                  championship.
                </>
              ) : null}
            </>
          }
          actions={
            hasResults && lastUpdated ? (
              <p className="text-xs text-text-muted">
                Last updated{' '}
                <time dateTime={new Date(lastUpdated).toISOString()}>
                  {formatDateLong(lastUpdated, LAST_UPDATED_FORMAT)}
                </time>
              </p>
            ) : null
          }
        />

        {hasResults ? (
          <div className="space-y-10">
            {movers.length > 0 && (
              <section aria-labelledby="biggest-movers">
                <h2
                  id="biggest-movers"
                  className="mb-1 text-lg font-semibold text-text"
                >
                  Biggest gaps to the championship
                </h2>
                <p className="gpp-reading-copy mb-4 text-sm text-text-muted">
                  Where a driver's qualifying position and their championship
                  position disagree most.
                </p>
                <ul className="grid gap-x-6 sm:grid-cols-2 sm:gap-y-4 lg:grid-cols-3">
                  {movers.map((mover) => (
                    <MoverCard key={mover.driverId} mover={mover} />
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="qualifying-drivers">
              <h2
                id="qualifying-drivers"
                className="mb-3 flex items-center gap-2 text-lg font-semibold text-text"
              >
                <Timer className="h-5 w-5 text-accent" />
                Drivers
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                {/*
                  Narrow columns are pinned on phones for the same reason as
                  `/f1-standings`: left to size itself the table hands slack to
                  Pos and Pts while the driver names wrap raggedly.
                */}
                <table className="w-full min-w-[21rem] table-fixed border-collapse text-sm sm:table-auto">
                  <caption className="sr-only">
                    {season} Formula 1 season scored on qualifying results only,
                    with each driver's team, poles, front rows, points, and
                    their position in the real World Championship for
                    comparison.
                  </caption>
                  <thead>
                    <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-label text-text-muted uppercase">
                      <th
                        scope="col"
                        className="w-11 px-2 py-2.5 sm:w-auto sm:px-3"
                      >
                        Pos
                      </th>
                      <th scope="col" className="px-2 py-2.5 sm:px-3">
                        Driver
                      </th>
                      {/* Team and the Saturday counts fold into the driver cell
                          below `sm` rather than being dropped, so the mobile
                          document still carries every team name. */}
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 sm:table-cell"
                      >
                        Team
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right sm:table-cell"
                      >
                        Poles
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right md:table-cell"
                      >
                        Front rows
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right sm:table-cell"
                      >
                        <abbr title="World Drivers' Championship position">
                          WDC
                        </abbr>
                      </th>
                      <th
                        scope="col"
                        className="w-14 px-2 py-2.5 text-right sm:w-auto sm:px-3"
                      >
                        {/* Spelled out rather than a bare delta glyph: the
                            column is the whole point of the page and a header
                            has to survive being read on its own. */}
                        <span className="sm:hidden">+/−</span>
                        <span className="hidden sm:inline">Change</span>
                      </th>
                      <th
                        scope="col"
                        className="w-12 px-2 py-2.5 text-right sm:w-auto sm:px-3"
                      >
                        <span className="sm:hidden">Pts</span>
                        <span className="hidden sm:inline">Points</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver) => (
                      <tr
                        key={driver.driverId}
                        className="border-t border-border/70"
                      >
                        <td className="gpp-mono px-2 py-2.5 font-semibold text-text-muted sm:px-3">
                          {driver.qualifyingPosition}
                        </td>
                        <th
                          scope="row"
                          className="px-2 py-2.5 text-left font-normal sm:px-3"
                        >
                          <span className="flex items-center gap-2">
                            <DriverBadge
                              code={driver.code}
                              team={driver.team}
                              displayName={driver.displayName}
                              number={driver.number}
                              nationality={driver.nationality}
                              size="sm"
                              prerenderTooltip={false}
                            />
                            <span className="min-w-0">
                              <span className="block font-medium text-text">
                                {driver.displayName}
                              </span>
                              <span className="block text-xs text-text-muted sm:hidden">
                                {driverSubline(driver)}
                              </span>
                            </span>
                          </span>
                        </th>
                        <td className="hidden px-3 py-2.5 text-text-muted sm:table-cell">
                          {driver.team ? displayTeamName(driver.team) : '—'}
                        </td>
                        <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted sm:table-cell">
                          {driver.wins}
                        </td>
                        <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted md:table-cell">
                          {driver.podiums}
                        </td>
                        <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted sm:table-cell">
                          P{driver.championshipPosition}
                        </td>
                        <td className="px-2 py-2.5 text-right sm:px-3">
                          <span className="inline-flex justify-end">
                            <RankDelta delta={driver.delta} />
                          </span>
                        </td>
                        <td className="gpp-mono px-2 py-2.5 text-right font-semibold text-text sm:px-3">
                          {driver.qualifyingPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {constructors.length > 0 && (
              <section aria-labelledby="qualifying-constructors">
                <h2
                  id="qualifying-constructors"
                  className="mb-3 flex items-center gap-2 text-lg font-semibold text-text"
                >
                  <Flag className="h-5 w-5 text-accent" />
                  Constructors
                </h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[19rem] border-collapse text-sm">
                    <caption className="sr-only">
                      {season} Formula 1 constructors scored on qualifying
                      results only, with each team's position in the real World
                      Constructors' Championship for comparison.
                    </caption>
                    <thead>
                      <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-label text-text-muted uppercase">
                        <th scope="col" className="px-2 py-2.5 sm:px-3">
                          Pos
                        </th>
                        <th scope="col" className="px-2 py-2.5 sm:px-3">
                          Team
                        </th>
                        <th
                          scope="col"
                          className="hidden px-2 py-2.5 text-right sm:table-cell sm:px-3"
                        >
                          <abbr title="World Constructors' Championship position">
                            WCC
                          </abbr>
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-2.5 text-right sm:px-3"
                        >
                          <span className="sm:hidden">+/−</span>
                          <span className="hidden sm:inline">Change</span>
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-2.5 text-right sm:px-3"
                        >
                          <span className="sm:hidden">Pts</span>
                          <span className="hidden sm:inline">Points</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {constructors.map((team) => (
                        <tr
                          key={team.team}
                          className="border-t border-border/70"
                        >
                          <td className="gpp-mono px-2 py-2.5 font-semibold text-text-muted sm:px-3">
                            {team.qualifyingPosition}
                          </td>
                          <th
                            scope="row"
                            className="px-2 py-2.5 text-left font-normal sm:px-3"
                          >
                            <span className="flex items-center gap-2.5">
                              {/* Matches the weight of the driver badges in
                                  the table above, as on /f1-standings. */}
                              <span
                                aria-hidden
                                className="h-6 w-1.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: teamColor(team.team),
                                }}
                              />
                              <span className="font-medium text-text">
                                {displayTeamName(team.team)}
                              </span>
                            </span>
                          </th>
                          <td className="gpp-mono hidden px-2 py-2.5 text-right text-text-muted sm:table-cell sm:px-3">
                            P{team.championshipPosition}
                          </td>
                          <td className="px-2 py-2.5 text-right sm:px-3">
                            <span className="inline-flex justify-end">
                              <RankDelta delta={team.delta} />
                            </span>
                          </td>
                          <td className="gpp-mono px-2 py-2.5 text-right font-semibold text-text sm:px-3">
                            {team.qualifyingPoints}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section aria-labelledby="how-this-is-scored">
              <h2
                id="how-this-is-scored"
                className="mb-3 text-lg font-semibold text-text"
              >
                How this is scored
              </h2>
              <div className="gpp-reading-copy space-y-3 text-sm text-text-muted">
                <p>
                  Formula 1 awards no points for qualifying. This table applies
                  the Grand Prix points table (25-18-15-12-10-8-6-4-2-1) to the
                  qualifying classification, and the sprint table
                  (8-7-6-5-4-3-2-1) to sprint qualifying, because those are the
                  sessions that set each grid.
                </p>
                <p>
                  Poles and front rows count from qualifying only. A driver with
                  no time set scores nothing and does not take a grid slot from
                  the drivers behind them. Teams are scored on the drivers who
                  qualified for them at that round, so a mid-season move does
                  not carry points to a new team.
                </p>
                <p>
                  Positions come from the same published classifications that
                  score the prediction game, so grid penalties do not change
                  them.{' '}
                  <Link
                    to="/results-policy"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Read the results and penalties policy
                  </Link>
                  .
                </p>
              </div>
            </section>
          </div>
        ) : (
          <NoticeCard
            description={`No ${season} qualifying results have been published yet. The qualifying championship will appear here after the first session.`}
          />
        )}

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          <Link
            to="/f1-standings"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {season} F1 championship standings
          </Link>
          <Link
            to="/f1-team-mate-battles"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Team-mate qualifying battles
          </Link>
          <Link
            to="/races"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {season} race calendar
          </Link>
          <Link
            to="/f1-predictions-this-weekend"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Predict this weekend's qualifying
          </Link>
        </div>
      </div>
    </div>
  );
}
