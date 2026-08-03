import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
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
const PATH = '/f1-team-mate-battles';
type TeammateBattles = FunctionReturnType<typeof api.h2h.getTeammateBattles>;
type BattleTeam = TeammateBattles['teams'][number];
type BattleDriver = BattleTeam['drivers'][number];

/**
 * Viewer-agnostic page, so the date is pinned to one locale and zone. Left to
 * the device default it would render differently on server and client, which
 * is a hydration mismatch on an otherwise static document.
 */
const LAST_UPDATED_FORMAT: UserDateSettings = {
  locale: 'en-GB',
  timezone: 'UTC',
};

export const Route = createFileRoute('/f1-team-mate-battles')({
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
      ? `Who is beating their team-mate in ${SEASON} F1? ${biggestGap.drivers[0].displayName} leads ${biggestGap.drivers[1].displayName} ${biggestGap.drivers[0].total}-${biggestGap.drivers[1].total}. Qualifying, sprint and race records for every pairing.`
      : `Head-to-head records for every ${SEASON} Formula 1 team-mate pairing, split by qualifying, sprint and race from the official classification.`;

    const meta = pageMeta({
      title: `${SEASON} F1 Team-mate Head-to-Head | Grand Prix Picks`,
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
                name: `${SEASON} F1 team-mate head-to-head records`,
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
                { name: 'Team-mate head-to-head', path: PATH },
              ]),
              ...(battles?.teams.length
                ? [
                    {
                      '@type': 'ItemList',
                      '@id': `${siteConfig.url}${PATH}#matchups`,
                      name: `${SEASON} F1 team-mate head-to-head records`,
                      numberOfItems: battles.teams.length,
                      itemListOrder:
                        'https://schema.org/ItemListOrderUnordered',
                      itemListElement: battles.teams.map((team, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        name: `${displayTeamName(team.team)}: ${team.drivers[0].displayName} ${team.drivers[0].total}-${team.drivers[1].total} ${team.drivers[1].displayName}`,
                      })),
                    },
                  ]
                : []),
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

function Driver({
  driver,
  team,
  align,
}: {
  driver: BattleDriver;
  team: string;
  align: 'left' | 'right';
}) {
  const name = (
    <span className="hidden truncate text-base text-text-muted sm:inline">
      {driver.displayName}
    </span>
  );
  const badge = (
    <DriverBadge
      code={driver.code}
      team={team}
      displayName={driver.displayName}
      number={driver.number}
      nationality={driver.nationality}
    />
  );

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === 'right' ? 'justify-end' : ''
      }`}
    >
      {align === 'left' ? badge : name}
      {align === 'left' ? name : badge}
    </div>
  );
}

function ScoreBreakdown({
  label,
  lead,
  trail,
  sprint = false,
}: {
  label: string;
  lead: number;
  trail: number;
  sprint?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-center gap-1.5">
      <dt className={sprint ? 'text-sprint-text' : undefined}>{label}</dt>
      <dd className="gpp-mono font-semibold text-text">
        {lead}-{trail}
      </dd>
    </div>
  );
}

function screenReaderSummary(
  lead: BattleDriver,
  trail: BattleDriver,
  includeSprints: boolean,
): string {
  const result =
    lead.total === trail.total
      ? `${lead.displayName} and ${trail.displayName} are tied at ${lead.total} wins each.`
      : `${lead.displayName} leads ${trail.displayName} by ${lead.total} wins to ${trail.total}.`;
  const standard = `Qualifying: ${lead.qualifying} to ${trail.qualifying}. Race: ${lead.race} to ${trail.race}.`;
  const sprint = includeSprints
    ? `Sprint qualifying: ${lead.sprintQualifying} to ${trail.sprintQualifying}. Sprint: ${lead.sprint} to ${trail.sprint}.`
    : '';

  return `${result} ${standard} ${sprint}`.trim();
}

function TeammateBattlesPage() {
  const { battles } = Route.useLoaderData();
  const hasData = battles.teams.some((team) => team.sessionsSettled > 0);
  const sprintSessions =
    battles.sessionCounts.sprintQualifying + battles.sessionCounts.sprint;
  const includeSprints = sprintSessions > 0;

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          eyebrow="Formula 1"
          title={`${SEASON} F1 team-mate head-to-head`}
          subtitle={
            <p className="text-base">
              The season-long record for every team-mate pairing, based on
              official qualifying, sprint and race classifications.
            </p>
          }
          actions={
            battles.lastUpdated ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
                <span>
                  Updated{' '}
                  <time dateTime={new Date(battles.lastUpdated).toISOString()}>
                    {formatDateLong(battles.lastUpdated, LAST_UPDATED_FORMAT)}
                  </time>
                </span>
                <span aria-hidden>·</span>
                <span>{battles.sessionsCounted} classified sessions</span>
                <span>
                  ({battles.sessionCounts.qualifying} qualifying ·{' '}
                  {battles.sessionCounts.race}{' '}
                  {battles.sessionCounts.race === 1 ? 'race' : 'races'}
                  {includeSprints ? (
                    <>
                      {' '}
                      ·{' '}
                      <span className="text-sprint-text">
                        {battles.sessionCounts.sprintQualifying} sprint
                        qualifying · {battles.sessionCounts.sprint}{' '}
                        {battles.sessionCounts.sprint === 1
                          ? 'sprint'
                          : 'sprints'}
                      </span>
                    </>
                  ) : null}
                  )
                </span>
              </p>
            ) : null
          }
        />

        {!hasData ? (
          <p className="rounded-sm border border-border bg-surface px-4 py-6 text-base text-text-muted">
            No sessions have been classified yet this season. Records appear
            here once the first qualifying session is published.
          </p>
        ) : (
          <div className="grid gap-x-10 gap-y-3 border-y border-border py-3 lg:grid-cols-2">
            {battles.teams.map((team, index) => {
              const [lead, trail] = team.drivers;
              const drawn = lead.total === trail.total;
              const headingId = `team-${team.matchupId}`;
              const isUnpairedLastTeam =
                battles.teams.length % 2 === 1 &&
                index === battles.teams.length - 1;

              return (
                <section
                  key={team.matchupId}
                  aria-labelledby={headingId}
                  className={`py-4 ${
                    isUnpairedLastTeam
                      ? 'lg:col-span-2 lg:mx-auto lg:w-[calc(50%-1.25rem)]'
                      : ''
                  }`}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-3 w-1 rounded-full"
                      style={{ backgroundColor: teamColor(team.team) }}
                    />
                    <h2
                      id={headingId}
                      className="text-base font-semibold text-text"
                    >
                      {displayTeamName(team.team)}
                    </h2>
                  </div>

                  <p className="sr-only">
                    {screenReaderSummary(lead, trail, includeSprints)}
                  </p>

                  <div aria-hidden>
                    <div className="flex items-center gap-3 sm:gap-5">
                      <Driver driver={lead} team={team.team} align="left" />

                      <div className="shrink-0 text-center">
                        <p className="font-title gpp-mono text-xl font-semibold text-text">
                          {lead.total}
                          <span className="mx-1 text-text-muted">-</span>
                          {trail.total}
                        </p>
                        <p className="text-sm text-text-muted">
                          {drawn ? 'All square' : 'Sessions won'}
                        </p>
                      </div>

                      <Driver driver={trail} team={team.team} align="right" />
                    </div>

                    <div className="mt-3">
                      <TallyBar lead={lead.total} trail={trail.total} />
                      <dl
                        className={`mt-2 grid gap-x-4 gap-y-1 text-base text-text-muted ${
                          includeSprints
                            ? 'grid-cols-2'
                            : 'grid-cols-2 sm:flex sm:justify-center sm:gap-6'
                        }`}
                      >
                        <ScoreBreakdown
                          label="Qualifying"
                          lead={lead.qualifying}
                          trail={trail.qualifying}
                        />
                        <ScoreBreakdown
                          label="Race"
                          lead={lead.race}
                          trail={trail.race}
                        />
                        {includeSprints ? (
                          <>
                            <ScoreBreakdown
                              label="Sprint quali"
                              lead={lead.sprintQualifying}
                              trail={trail.sprintQualifying}
                              sprint
                            />
                            <ScoreBreakdown
                              label="Sprint"
                              lead={lead.sprint}
                              trail={trail.sprint}
                              sprint
                            />
                          </>
                        ) : null}
                      </dl>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <section className="mt-10 pt-8">
          <h2 className="font-title text-xl font-semibold text-text">
            How these records are counted
          </h2>
          <div className="mt-3 max-w-4xl space-y-3 text-lg leading-7 text-text-muted">
            <p>
              A driver wins a session when they are classified ahead of their
              team-mate in the official result. Qualifying, sprint qualifying,
              Grands Prix and sprints are shown separately; the headline score
              is the sum of all four.
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
              Team-mate battles are also a game on Grand Prix Picks: pick the
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

        <section className="mt-8 rounded-sm border border-accent/25 bg-accent-muted/20 p-6 text-center sm:p-8">
          <Swords className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden />
          <h2 className="font-title text-xl font-semibold text-text">
            Think you can call the next one?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-base leading-6 text-text-muted">
            Pick a winner from every team-mate pairing before the next session
            locks and see how your record compares.
          </p>
          <Link
            to="/races"
            className="mt-5 inline-flex items-center rounded-sm bg-accent px-4 py-2 text-base font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
          >
            Make your picks
          </Link>
        </section>
      </div>
    </div>
  );
}
