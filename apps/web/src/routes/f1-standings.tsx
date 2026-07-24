import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Flag, Trophy } from 'lucide-react';

import { convexHttp as convex } from '@/integrations/convex/client';
import { withRetry } from '@/lib/retry';
import { pageMeta, siteConfig } from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

const SEASON = 2026;

export const Route = createFileRoute('/f1-standings')({
  component: F1StandingsPage,
  loader: async () => {
    const standings = await withRetry(() =>
      convex.query(api.f1Standings.getF1Championship, { season: SEASON }),
    );
    return { standings };
  },
  head: ({ loaderData }) => {
    const standings = loaderData?.standings;
    const leader = standings?.drivers[0];
    const description = leader
      ? `${SEASON} Formula 1 World Championship standings — ${leader.displayName} leads on ${leader.points} points. Full drivers' and constructors' standings, updated after every Grand Prix.`
      : `${SEASON} Formula 1 World Championship standings — full drivers' and constructors' points, updated after every Grand Prix.`;

    const scripts: { type: string; children: string }[] = [];
    if (standings && standings.drivers.length > 0) {
      scripts.push({
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${SEASON} F1 Drivers' Championship Standings`,
          description: `Formula 1 ${SEASON} World Drivers' Championship standings.`,
          url: `${siteConfig.url}/f1-standings`,
          numberOfItems: standings.drivers.length,
          itemListOrder: 'https://schema.org/ItemListOrderDescending',
          itemListElement: standings.drivers.slice(0, 20).map((driver) => ({
            '@type': 'ListItem',
            position: driver.position,
            name: driver.displayName,
          })),
        }),
      });
    }

    return {
      ...pageMeta({
        title: `${SEASON} F1 Championship Standings — Drivers & Constructors | Grand Prix Picks`,
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

function F1StandingsPage() {
  const { standings } = Route.useLoaderData();
  const { drivers, constructors, roundsScored, season } = standings;
  const hasResults = drivers.length > 0 && roundsScored > 0;
  const leader = drivers[0];

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-7">
          <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            Formula 1
          </p>
          <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
            {season} F1 Championship Standings
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
            The {season} Formula 1 World Championship standings for drivers and
            constructors, scored from official race and sprint results and
            updated after every Grand Prix.{' '}
            {hasResults && leader ? (
              <>
                {leader.displayName} leads the drivers' championship on{' '}
                {leader.points} points after {roundsScored}{' '}
                {roundsScored === 1 ? 'round' : 'rounds'}.
              </>
            ) : null}
          </p>
        </header>

        {hasResults ? (
          <div className="space-y-10">
            <section aria-label="Drivers' championship">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
                <Trophy className="h-5 w-5 text-accent" />
                Drivers' Championship
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[26rem] border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                      <th className="px-3 py-2.5">Pos</th>
                      <th className="px-3 py-2.5">Driver</th>
                      <th className="px-3 py-2.5">Team</th>
                      <th className="px-3 py-2.5 text-right">Wins</th>
                      <th className="px-3 py-2.5 text-right">Podiums</th>
                      <th className="px-3 py-2.5 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver) => (
                      <tr
                        key={driver.driverId}
                        className="border-t border-border/70"
                      >
                        <td className="px-3 py-2.5 font-semibold text-text-muted tabular-nums">
                          {driver.position}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="h-4 w-1 shrink-0 rounded-full"
                              style={{
                                backgroundColor: teamColor(driver.team),
                              }}
                            />
                            <span className="font-medium text-text">
                              {driver.displayName}
                            </span>
                            <span className="text-xs text-text-muted">
                              {driver.code}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted">
                          {driver.team ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right text-text-muted tabular-nums">
                          {driver.wins}
                        </td>
                        <td className="px-3 py-2.5 text-right text-text-muted tabular-nums">
                          {driver.podiums}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-text tabular-nums">
                          {driver.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {constructors.length > 0 && (
              <section aria-label="Constructors' championship">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
                  <Flag className="h-5 w-5 text-accent" />
                  Constructors' Championship
                </h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[22rem] border-collapse text-sm">
                    <thead>
                      <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                        <th className="px-3 py-2.5">Pos</th>
                        <th className="px-3 py-2.5">Team</th>
                        <th className="px-3 py-2.5 text-right">Wins</th>
                        <th className="px-3 py-2.5 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {constructors.map((team) => (
                        <tr
                          key={team.team}
                          className="border-t border-border/70"
                        >
                          <td className="px-3 py-2.5 font-semibold text-text-muted tabular-nums">
                            {team.position}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className="h-4 w-1 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: teamColor(team.team),
                                }}
                              />
                              <span className="font-medium text-text">
                                {team.team}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-text-muted tabular-nums">
                            {team.wins}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-text tabular-nums">
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
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm text-text-muted">
              No {season} results have been published yet. Championship
              standings will appear here after the first Grand Prix.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          <Link
            to="/races"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {season} race calendar
          </Link>
          <Link
            to="/leaderboard"
            search={{ time: 'season', mode: 'combined' }}
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
