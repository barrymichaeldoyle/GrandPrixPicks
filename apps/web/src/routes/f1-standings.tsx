import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Flag, Trophy } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { PageHeader } from '@/components/PageHeader';
import { formatDateLong, type UserDateSettings } from '@/lib/date';
import { displayTeamName } from '@/lib/display';
import { setChampionshipCacheHeaders } from '@/lib/championshipCacheHeaders';
import { routeQuery } from '@/lib/routeQuery';
import { pageMeta, siteConfig } from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';
import { NoticeCard } from '@/components/NoticeCard';

const SEASON = 2026;

export const Route = createFileRoute('/f1-standings')({
  component: F1StandingsPage,
  loader: async ({ context }) => {
    const [standings] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.f1Standings.getF1Championship, { season: SEASON }),
      ),
      setChampionshipCacheHeaders(),
    ]);
    return { standings };
  },
  head: ({ loaderData }) => {
    const standings = loaderData?.standings;
    const leader = standings?.drivers[0];
    // Kept short enough that the longest driver name on the grid still leaves
    // it inside the 160-character SERP limit, and punctuated with a colon
    // rather than an em dash, per the copy convention.
    const description = leader
      ? `${SEASON} Formula 1 championship standings: ${leader.displayName} leads on ${leader.points} points. Full drivers' and constructors' tables, updated after every race.`
      : `${SEASON} Formula 1 championship standings: the full drivers' and constructors' points tables, updated after every race of the season.`;

    const scripts: { type: string; children: string }[] = [];
    if (standings && standings.drivers.length > 0) {
      const pageUrl = `${siteConfig.url}/f1-standings`;
      scripts.push({
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebPage',
              '@id': pageUrl,
              url: pageUrl,
              name: `${SEASON} F1 Championship Standings`,
              description,
              // Signals to crawlers how current the table is — this page's
              // whole value is being up to date after the latest Grand Prix.
              ...(standings.lastUpdated
                ? {
                    dateModified: new Date(standings.lastUpdated).toISOString(),
                  }
                : {}),
            },
            {
              '@type': 'ItemList',
              name: `${SEASON} F1 Drivers' Championship Standings`,
              description: `Formula 1 ${SEASON} World Drivers' Championship standings.`,
              url: pageUrl,
              numberOfItems: standings.drivers.length,
              // Positions are emitted 1, 2, 3… — ascending, in schema.org's
              // sense, even though the points they rank by run downwards.
              itemListOrder: 'https://schema.org/ItemListOrderAscending',
              itemListElement: standings.drivers.map((driver) => ({
                '@type': 'ListItem',
                position: driver.position,
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
        title: `${SEASON} F1 Standings: Drivers & Constructors`,
        description,
        path: '/f1-standings',
      }),
      scripts,
    };
  },
});

function teamColor(team: string | null): string {
  return (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
}

/**
 * The secondary line under a driver's name on phones, carrying the Team and
 * Wins columns that only appear as columns once the viewport can afford them.
 */
function driverSubline(driver: { team: string | null; wins: number }): string {
  const parts = [driver.team ? displayTeamName(driver.team) : '—'];
  if (driver.wins > 0) {
    parts.push(`${driver.wins} ${driver.wins === 1 ? 'win' : 'wins'}`);
  }
  return parts.join(' · ');
}

/**
 * This page is viewer-agnostic (it is the same document for every crawler and
 * signed-out visitor), so the "last updated" date is pinned to a fixed locale
 * and time zone rather than the device default. Left to the default it would
 * render one way on the server and another in a browser set to a different
 * locale or zone, which is a hydration mismatch on an otherwise static page.
 */
const LAST_UPDATED_FORMAT: UserDateSettings = {
  locale: 'en-GB',
  timezone: 'UTC',
};

function F1StandingsPage() {
  const { standings: initialStandings } = Route.useLoaderData();
  // Also the observer that keeps the loader's cache entry subscribed; without
  // it the entry would sit unwatched behind an infinite stale time.
  const { data: liveStandings } = useQuery(
    routeQuery(api.f1Standings.getF1Championship, { season: SEASON }),
  );
  const standings = liveStandings ?? initialStandings;
  const { constructors, drivers, lastUpdated, roundsScored, season } =
    standings;
  const hasResults = drivers.length > 0 && roundsScored > 0;
  const leader = drivers[0];

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          eyebrow="Formula 1"
          title={`${season} F1 Championship Standings`}
          subtitle={
            <>
              The {season} Formula 1 World Championship standings for drivers
              and constructors, scored from official race and sprint results and
              updated after every Grand Prix.{' '}
              {hasResults && leader ? (
                <>
                  {leader.displayName} leads the drivers' championship on{' '}
                  {leader.points} points after {roundsScored}{' '}
                  {roundsScored === 1 ? 'round' : 'rounds'}.
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
            <section aria-labelledby="drivers-championship">
              <h2
                id="drivers-championship"
                className="mb-3 flex items-center gap-2 text-lg font-semibold text-text"
              >
                <Trophy className="h-5 w-5 text-accent" />
                Drivers' Championship
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                {/*
                  Phones get a fixed layout with explicit widths. Left to size
                  itself the table hands slack to Pos and Points — columns whose
                  content never exceeds three characters — while the driver
                  names starve and wrap raggedly. Pinning the narrow columns
                  spends that slack on the names instead. Desktop has room to
                  spare and goes back to sizing itself.
                */}
                <table className="w-full min-w-[19rem] table-fixed border-collapse text-sm sm:table-auto">
                  <caption className="sr-only">
                    {season} Formula 1 World Drivers' Championship standings,
                    with each driver's team, race wins, podium finishes and
                    championship points.
                  </caption>
                  <thead>
                    <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-label text-text-muted uppercase">
                      {/* Widths are set by these uppercase, letter-spaced
                          labels rather than by the digits below them: "POS"
                          is wider than "22", and "POINTS" is wider than "153".
                          Hence the short mobile label for points. */}
                      <th
                        scope="col"
                        className="w-11 px-2 py-2.5 sm:w-auto sm:px-3"
                      >
                        Pos
                      </th>
                      <th scope="col" className="px-2 py-2.5 sm:px-3">
                        Driver
                      </th>
                      {/* Team and Wins do not become their own columns until
                          there is room for them. Below `sm` they fold into the
                          driver cell instead of being dropped, so the mobile
                          document still carries every team name — which
                          matters on a page whose traffic is organic search. */}
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
                        Wins
                      </th>
                      <th
                        scope="col"
                        className="hidden px-3 py-2.5 text-right sm:table-cell"
                      >
                        Podiums
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
                          {driver.position}
                        </td>
                        <th
                          scope="row"
                          className="px-2 py-2.5 text-left font-normal sm:px-3"
                        >
                          <span className="flex items-center gap-2">
                            {/* The badge already carries the team colour, so it
                                replaces the plain colour bar this table used. */}
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
                        <td className="gpp-mono hidden px-3 py-2.5 text-right text-text-muted sm:table-cell">
                          {driver.podiums}
                        </td>
                        <td className="gpp-mono px-2 py-2.5 text-right font-semibold text-text sm:px-3">
                          {driver.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {constructors.length > 0 && (
              <section aria-labelledby="constructors-championship">
                <h2
                  id="constructors-championship"
                  className="mb-3 flex items-center gap-2 text-lg font-semibold text-text"
                >
                  <Flag className="h-5 w-5 text-accent" />
                  Constructors' Championship
                </h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[17rem] border-collapse text-sm">
                    <caption className="sr-only">
                      {season} Formula 1 World Constructors' Championship
                      standings, with each team's race wins and championship
                      points.
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
                          className="px-2 py-2.5 text-right sm:px-3"
                        >
                          Wins
                        </th>
                        <th
                          scope="col"
                          className="px-2 py-2.5 text-right sm:px-3"
                        >
                          Points
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
                            {team.position}
                          </td>
                          <th
                            scope="row"
                            className="px-2 py-2.5 text-left font-normal sm:px-3"
                          >
                            <span className="flex items-center gap-2.5">
                              {/* Matches the weight of the driver badges in the
                                  table above, so the two read as one system. */}
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
                          <td className="gpp-mono px-2 py-2.5 text-right text-text-muted sm:px-3">
                            {team.wins}
                          </td>
                          <td className="gpp-mono px-2 py-2.5 text-right font-semibold text-text sm:px-3">
                            {team.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        ) : (
          <NoticeCard
            description={`No ${season} results have been published yet. Championship standings will appear here after the first Grand Prix.`}
          />
        )}

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          <Link
            to="/f1-qualifying-standings"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {SEASON} qualifying championship
          </Link>
          <Link
            to="/guides/$guideSlug"
            params={{ guideSlug: 'f1-points-system-explained' }}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            How F1 points work
          </Link>
          <Link
            to="/races"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {season} race calendar
          </Link>
          <Link
            to="/leaderboard"
            search={{ time: 'season' }}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Prediction game leaderboard
          </Link>
          <Link
            to="/"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Play Grand Prix Picks
          </Link>
        </div>
      </div>
    </div>
  );
}
