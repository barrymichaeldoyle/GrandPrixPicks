import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';

import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { useQuery } from '@tanstack/react-query';
import type { FunctionReturnType } from 'convex/server';
import { Swords } from 'lucide-react';

import { DriverBadge } from '@/components/DriverBadge';
import { PageHeader } from '@/components/PageHeader';
import { formatDateLong, type UserDateSettings } from '@/lib/date';
import { displayTeamName, pairingRoundSpanLabel } from '@/lib/display';
import { pairingAnchorAliases, pairingAnchorIds } from '@/lib/pairingAnchors';
import { routeQuery } from '@/lib/routeQuery';
import {
  breadcrumbSchema,
  CURRENT_SEASON,
  pageMeta,
  siteConfig,
} from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

/**
 * Falls back only until the loader answers. `getTeammateBattles` derives the
 * season itself, so the page follows a rollover without an edit here.
 */
const SEASON = CURRENT_SEASON;
const PATH = '/f1-team-mate-battles';

/**
 * Questions people actually type, answered in the page's own prose.
 *
 * Search Console has this page at position 4.0 for "where can i see a
 * head-to-head comparison of teammates: qualifying record, race finishes, and
 * points?" and 16.3 overall, with a cluster behind it that the page never
 * answered in words: "h2h f1 meaning" (11.0), "f1 head to head" (51.0), "race
 * h2h" (52.0), "f1 team mate head to head" (53.0).
 *
 * Each answer covers ground the "How these records are counted" section below
 * does not. That section owns what a session win is, retirements and
 * disqualifications, and grid penalties; repeating any of it here would be the
 * same idea said twice on one page.
 */
const FAQS = [
  {
    question: 'What does H2H mean in Formula 1?',
    answer:
      'Head-to-head, usually shortened to H2H. It compares two drivers directly rather than placing them in the championship. On this page it always means the two drivers in the same team.',
  },
  {
    question: 'What happens when a team changes its line-up mid-season?',
    answer:
      'The old pairing keeps the rounds it actually ran and the replacement starts a record of its own, each labelled with the rounds it covers. The two are never merged, because they are different contests.',
  },
  {
    question: 'Do these records reset each season?',
    answer: `Yes. Every record on this page covers the ${SEASON} season only.`,
  },
  {
    question:
      'Can a driver lead the head-to-head and still be behind on points?',
    answer:
      'Yes. The head-to-head counts sessions won, not points scored. A retirement from the lead costs a driver a full race win in points while changing only one session in this table.',
  },
] as const;
type TeammateBattles = FunctionReturnType<typeof api.h2h.getTeammateBattles>;
type BattleTeam = TeammateBattles['teams'][number];
type BattleDriver = BattleTeam['drivers'][number];

function pairingCountByTeam(
  teams: readonly { team: string }[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of teams) {
    counts.set(row.team, (counts.get(row.team) ?? 0) + 1);
  }
  return counts;
}

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
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();

    const battles = await context.queryClient.ensureQueryData(
      routeQuery(api.h2h.getTeammateBattles, {}),
    );
    return { battles };
  },
  head: ({ loaderData }) => {
    const battles = loaderData?.battles;
    const pairingCounts = pairingCountByTeam(battles?.teams ?? []);
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
              {
                '@type': 'FAQPage',
                '@id': `${siteConfig.url}${PATH}#faq`,
                mainEntity: FAQS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
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
                      itemListElement: battles.teams.map((team, index) => {
                        const span =
                          pairingCounts.get(team.team)! > 1 &&
                          team.fromRound != null
                            ? ` (${pairingRoundSpanLabel(team.fromRound, team.toRound)})`
                            : '';
                        return {
                          '@type': 'ListItem',
                          position: index + 1,
                          name: `${displayTeamName(team.team)}${span}: ${team.drivers[0].displayName} ${team.drivers[0].total}-${team.drivers[1].total} ${team.drivers[1].displayName}`,
                        };
                      }),
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
    // Every Driver here renders inside the `aria-hidden` half of the card,
    // whose content the `sr-only` summary above it already states in prose.
    // Leaving the tooltip trigger focusable put 22 tab stops on this page
    // inside a region assistive tech is told is not there.
    <DriverBadge
      code={driver.code}
      team={team}
      displayName={driver.displayName}
      number={driver.number}
      nationality={driver.nationality}
      tooltipFocusable={false}
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
  const { battles: initialBattles } = Route.useLoaderData();
  // Also the observer that keeps the loader's cache entry subscribed; without
  // it the entry would sit unwatched behind an infinite stale time.
  const { data: liveBattles } = useQuery(
    routeQuery(api.h2h.getTeammateBattles, {}),
  );
  const battles = liveBattles ?? initialBattles;
  const hasData = battles.teams.some((team) => team.sessionsSettled > 0);
  const sprintSessions =
    battles.sessionCounts.sprintQualifying + battles.sessionCounts.sprint;
  const includeSprints = sprintSessions > 0;
  const pairingCounts = pairingCountByTeam(battles.teams);
  const anchorIds = pairingAnchorIds(battles.teams);
  // A pairing heading is keyed alphabetically so the anchor survives the duel
  // flipping, but someone quoting the record writes it in the order they said
  // it ("Verstappen leads Hadjar" -> #verstappen-hadjar). The browser does
  // nothing with a fragment that matches no element, so without this the link
  // silently lands at the top of the page. Resolve any accepted spelling to
  // the heading it means, and correct the URL so the next copy is canonical.
  //
  // Progressive enhancement: the anchors the page itself emits are already
  // canonical and need no JavaScript. This only rescues hand-written ones.
  const teams = battles.teams;
  useEffect(() => {
    function resolveHash() {
      const raw = decodeURIComponent(
        globalThis.location.hash.slice(1),
      ).toLowerCase();
      // An exact match is the browser's job and it has already done it.
      if (raw === '' || document.getElementById(raw) != null) {
        return;
      }
      const canonical = pairingAnchorAliases(teams).get(raw);
      const target =
        canonical == null ? null : document.getElementById(canonical);
      if (canonical == null || target == null) {
        return;
      }
      globalThis.history.replaceState(null, '', `#${canonical}`);
      target.scrollIntoView();
    }

    resolveHash();
    globalThis.addEventListener('hashchange', resolveHash);
    return () => globalThis.removeEventListener('hashchange', resolveHash);
  }, [teams]);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
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
              const headingId = anchorIds.get(team.matchupId)!;
              const spanLabel =
                pairingCounts.get(team.team)! > 1 && team.fromRound != null
                  ? pairingRoundSpanLabel(team.fromRound, team.toRound)
                  : null;
              const isUnpairedLastTeam =
                battles.teams.length % 2 === 1 &&
                index === battles.teams.length - 1;

              return (
                <section
                  key={team.matchupId}
                  aria-labelledby={headingId}
                  className={`group py-4 ${
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
                      {spanLabel ? (
                        <span className="ml-2 font-normal text-text-muted">
                          {spanLabel}
                        </span>
                      ) : null}
                    </h2>
                    {/*
                      An anchor nobody can see is an anchor nobody cites, so the
                      link has to be reachable — but a permalink is a background
                      affordance, not a call to action, so it stays quiet until
                      the pairing is hovered and appears on keyboard focus.
                    */}
                    <a
                      href={`#${headingId}`}
                      className="rounded-sm px-1 text-sm text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent focus-visible:opacity-100"
                    >
                      <span aria-hidden>#</span>
                      <span className="sr-only">
                        Link to {displayTeamName(team.team)} head-to-head
                      </span>
                    </a>
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
              You can also make team-mate picks on Grand Prix Picks. Choose who
              finishes ahead in each team before a session and score one point
              for every correct pick.{' '}
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

        <section className="mt-10" aria-labelledby="common-questions">
          <h2
            id="common-questions"
            className="font-title text-xl font-semibold text-text"
          >
            Common questions
          </h2>
          <dl className="mt-4 max-w-4xl border-t border-border">
            {FAQS.map((faq) => (
              <div key={faq.question} className="border-b border-border py-4">
                <dt className="text-base font-semibold text-text">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-lg leading-7 text-text-muted">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
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
