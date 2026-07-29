import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Swords } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { PageHeader } from '@/components/PageHeader';
import { convexHttp as convex } from '@/integrations/convex/client';
import { formatDateLong, type UserDateSettings } from '@/lib/date';
import { displayTeamName } from '@/lib/display';
import { withRetry } from '@/lib/retry';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

const SEASON = 2026;
const PATH = '/f1-teammate-battles';

/**
 * Viewer-agnostic page, so the date is pinned to one locale and zone. Left to
 * the device default it would render differently on server and client, which
 * is a hydration mismatch on an otherwise static document.
 */
const LAST_UPDATED_FORMAT: UserDateSettings = {
  locale: 'en-GB',
  timezone: 'UTC',
};

export const Route = createFileRoute('/f1-teammate-battles')({
  component: TeammateBattlesPage,
  loader: async () => {
    const battles = await withRetry(() =>
      convex.query(api.h2h.getTeammateBattles, { season: SEASON }),
    );
    return { battles };
  },
  head: ({ loaderData }) => {
    const battles = loaderData?.battles;
    const biggestGap = [...(battles?.teams ?? [])].sort(
      (a, b) =>
        b.drivers[0].total -
        b.drivers[1].total -
        (a.drivers[0].total - a.drivers[1].total),
    )[0];

    const description = biggestGap
      ? `Who is beating their teammate in ${SEASON} F1? ${biggestGap.drivers[0].displayName} leads ${biggestGap.drivers[1].displayName} ${biggestGap.drivers[0].total}-${biggestGap.drivers[1].total}. Qualifying and race records for every pairing.`
      : `Head-to-head records for every ${SEASON} Formula 1 teammate pairing, split by qualifying and race, from the official classification.`;

    const meta = pageMeta({
      title: `${SEASON} F1 Teammate Head-to-Head | Grand Prix Picks`,
      description,
      path: PATH,
    });

    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': `${siteConfig.url}${PATH}#page`,
                url: `${siteConfig.url}${PATH}`,
                name: `${SEASON} F1 teammate head-to-head records`,
                description,
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
                ...(battles?.lastUpdated
                  ? {
                      dateModified: new Date(battles.lastUpdated).toISOString(),
                    }
                  : {}),
              },
              breadcrumbSchema(PATH, [
                { name: 'Teammate head-to-head', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function teamColor(team: string): string {
  return TEAM_COLORS[team] || FALLBACK_TEAM_COLOR;
}

function TallyBar({ lead, trail }: { lead: number; trail: number }) {
  const total = lead + trail;
  const leadShare = total === 0 ? 50 : Math.round((lead / total) * 100);

  return (
    <div
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
      aria-hidden
    >
      <div className="bg-accent" style={{ width: `${leadShare}%` }} />
      <div className="bg-border" style={{ width: `${100 - leadShare}%` }} />
    </div>
  );
}

function TeammateBattlesPage() {
  const { battles } = Route.useLoaderData();
  const hasData = battles.teams.some((team) => team.sessionsSettled > 0);

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          eyebrow={`${SEASON} season`}
          title="F1 teammate head-to-head"
          subtitle="Which driver is beating the one in the same car. Taken from the official classification for every session of the season, split into qualifying and race form."
        />

        {battles.lastUpdated ? (
          <p className="-mt-6 mb-8 text-xs text-text-muted">
            Updated {formatDateLong(battles.lastUpdated, LAST_UPDATED_FORMAT)} ·{' '}
            {battles.sessionsCounted} sessions counted
          </p>
        ) : null}

        {!hasData ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-text-muted">
            No sessions have been classified yet this season. Records appear
            here once the first qualifying session is published.
          </p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {battles.teams.map((team) => {
              const [lead, trail] = team.drivers;
              const drawn = lead.total === trail.total;

              return (
                <section key={team.matchupId} className="py-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-3 w-1 rounded-full"
                      style={{ backgroundColor: teamColor(team.team) }}
                    />
                    <h2 className="text-sm font-semibold text-text">
                      {displayTeamName(team.team)}
                    </h2>
                    <span className="text-xs text-text-muted">
                      {team.sessionsSettled}{' '}
                      {team.sessionsSettled === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <DriverBadge
                        code={lead.code}
                        team={team.team}
                        displayName={lead.displayName}
                        number={lead.number}
                        nationality={lead.nationality}
                      />
                      <span className="hidden truncate text-sm text-text-muted sm:inline">
                        {lead.displayName}
                      </span>
                    </div>

                    <div className="shrink-0 text-center">
                      <p className="font-title gpp-mono text-xl font-semibold text-text">
                        {lead.total}
                        <span className="mx-1 text-text-muted">-</span>
                        {trail.total}
                      </p>
                      <p className="text-xs text-text-muted">
                        {drawn ? 'All square' : 'Sessions won'}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className="hidden truncate text-sm text-text-muted sm:inline">
                        {trail.displayName}
                      </span>
                      <DriverBadge
                        code={trail.code}
                        team={team.team}
                        displayName={trail.displayName}
                        number={trail.number}
                        nationality={trail.nationality}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <TallyBar lead={lead.total} trail={trail.total} />
                    <dl className="mt-2 flex justify-center gap-6 text-xs text-text-muted">
                      <div className="flex gap-1.5">
                        <dt>Qualifying</dt>
                        <dd className="gpp-mono font-semibold text-text">
                          {lead.qualifying}-{trail.qualifying}
                        </dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt>Race</dt>
                        <dd className="gpp-mono font-semibold text-text">
                          {lead.race}-{trail.race}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-xl font-semibold text-text">
            How these records are counted
          </h2>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-6 text-text-muted">
            <p>
              A driver wins a session when they are classified ahead of their
              teammate in the official result. Qualifying and sprint qualifying
              count towards the qualifying record; races and sprints count
              towards the race record.
            </p>
            <p>
              Retirements and disqualifications still count, because the
              official classification still orders those drivers. A session
              where neither driver started is not counted at all, so the totals
              only reflect battles that actually happened. Grid penalties never
              affect a qualifying record, since they change the starting grid
              rather than the qualifying classification.{' '}
              <Link
                to="/results-policy"
                className="font-medium text-accent hover:underline"
              >
                Read the full results policy
              </Link>
              .
            </p>
            <p>
              Teammate battles are also a game on Grand Prix Picks: pick the
              winner of each pairing before a session and score a point for
              every one you call right.{' '}
              <Link
                to="/how-to-play"
                className="font-medium text-accent hover:underline"
              >
                See how scoring works
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-accent/25 bg-accent-muted/20 p-6 text-center sm:p-8">
          <Swords className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden />
          <h2 className="font-title text-xl font-semibold text-text">
            Think you can call the next one?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-muted">
            Pick a winner from every teammate pairing before the next session
            locks and see how your record compares.
          </p>
          <Link
            to="/races"
            className="mt-5 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
          >
            Make your picks
          </Link>
        </section>
      </div>
    </div>
  );
}
