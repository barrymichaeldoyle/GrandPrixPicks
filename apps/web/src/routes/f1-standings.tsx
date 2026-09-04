import { api } from '@convex-generated/api';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Flag, Trophy } from 'lucide-react';
import { useState } from 'react';

import { FaqItem } from '@/components/Faq';
import { NoticeCard } from '@/components/NoticeCard';
import { PageHeader } from '@/components/PageHeader';
import { ConstructorStandingsTable } from '@/components/standings/ConstructorStandingsTable';
import { DriverStandingsTable } from '@/components/standings/DriverStandingsTable';
import {
  chartRounds,
  constructorSeries,
  driverSeries,
} from '@/components/standings/charts/series';
import { StandingsChartsSection } from '@/components/standings/StandingsChartsSection';
import {
  GapModeToggle,
  type GapMode,
} from '@/components/standings/StandingsTableFrame';
import { setChampionshipCacheHeaders } from '@/lib/championshipCacheHeaders';
import { formatDateLong, type UserDateSettings } from '@/lib/date';
import { abbreviateGrandPrix, displayTeamName } from '@/lib/display';
import { routeQuery } from '@/lib/routeQuery';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import {
  type Championship,
  summarySentence,
  teamHistoryNote,
  tieGroups,
} from '@/lib/standings';

const SEASON = 2026;
const PATH = '/f1-standings';

/**
 * How many entries each chart draws before the legend has to be used.
 *
 * A bump chart of all 22 drivers is a ball of wool, and a progression chart of
 * it is worse; the tables above already serve the reader who wants everybody.
 * Constructors are drawn in full because eleven lines is still readable.
 */
const CHART_LIMITS = { gap: 10, progression: 6, bump: 10 };

/**
 * Questions this page is asked in search, answered from the same rules the
 * tables are computed with. The points tables live in
 * `f1Standings.RACE_POINTS` and `SPRINT_POINTS`.
 */
const FAQS = [
  {
    question: 'How are F1 points awarded?',
    answer:
      'The top ten finishers in a Grand Prix score 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1 point. The top eight in a sprint score 8, 7, 6, 5, 4, 3, 2 and 1. Nobody outside those positions scores.',
  },
  {
    question: 'How are ties broken?',
    answer:
      'By countback. The driver or team with more wins ranks higher; if they are still level, more second places decides it, then more thirds, and so on down the field.',
  },
  {
    question: 'Do sprint points count towards the championship?',
    answer:
      'Yes. Both tables on this page include sprint points. Wins and podiums are counted from Grands Prix only, which is how Formula 1 reports them.',
  },
  {
    question: 'When are these standings updated?',
    answer:
      'As soon as a session result is published, and again whenever a classification changes after a stewards’ decision. The date above the tables is the last time the points on this page moved.',
  },
] as const;

export const Route = createFileRoute('/f1-standings')({
  component: F1StandingsPage,
  loader: async ({ context }) => {
    const [standings] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.f1Standings.getF1Championship, {
          season: SEASON,
          includeHistory: true,
        }),
      ),
      setChampionshipCacheHeaders(),
    ]);
    return { standings };
  },
  head: ({ loaderData }) => {
    const standings = loaderData?.standings;
    const leader = standings?.drivers[0];
    const second = standings?.drivers[1];
    const lastRound = standings?.lastRound;

    // The race name earns its place in the title: "updated after the Dutch GP"
    // is the freshness signal a reader is looking for in the result. It is
    // dropped rather than truncated when the head terms plus the name would
    // run past the length a SERP shows.
    const base = `${SEASON} F1 Standings: Drivers & Constructors`;
    const dated = lastRound
      ? `${base} (After ${abbreviateGrandPrix(lastRound.name)})`
      : base;
    const title = dated.length <= 60 ? dated : base;

    const roundsLeft =
      standings && standings.roundsTotal > standings.roundsScored
        ? standings.roundsTotal - standings.roundsScored
        : 0;
    const description =
      leader && second
        ? `${SEASON} Formula 1 championship standings: ${leader.displayName} leads by ${second.gapToLeader} points after ${standings?.roundsScored} rounds, with ${roundsLeft} to go. Full drivers' and constructors' tables.`
        : `${SEASON} Formula 1 championship standings: the full drivers' and constructors' points tables, updated after every race of the season.`;

    const pageUrl = `${siteConfig.url}${PATH}`;
    const graph: Record<string, unknown>[] = [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: `${SEASON} F1 Championship Standings`,
        description,
        inLanguage: 'en',
        // Signals to crawlers how current the table is: this page's whole
        // value is being up to date after the latest Grand Prix.
        ...(standings?.lastUpdated
          ? { dateModified: new Date(standings.lastUpdated).toISOString() }
          : {}),
      },
      breadcrumbSchema(PATH, [{ name: 'F1 standings', path: PATH }]),
      {
        '@type': 'FAQPage',
        '@id': `${pageUrl}#faq`,
        mainEntity: FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ];

    if (standings && standings.drivers.length > 0) {
      graph.push({
        '@type': 'ItemList',
        '@id': `${pageUrl}#drivers`,
        name: `${SEASON} F1 Drivers' Championship Standings`,
        description: `Formula 1 ${SEASON} World Drivers' Championship standings.`,
        url: pageUrl,
        numberOfItems: standings.drivers.length,
        // Positions are emitted 1, 2, 3… — ascending, in schema.org's sense,
        // even though the points they rank by run downwards.
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: standings.drivers.map((driver) => ({
          '@type': 'ListItem',
          position: driver.position,
          name: driver.displayName,
          item: {
            '@type': 'Person',
            name: driver.displayName,
            ...(driver.team
              ? { memberOf: { '@type': 'SportsTeam', name: driver.team } }
              : {}),
          },
        })),
      });
    }

    return {
      ...pageMeta({ title, description, path: PATH }),
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': graph,
          }),
        },
      ],
    };
  },
});

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

/**
 * The facts that date the table, as a row of labelled figures rather than a
 * sentence.
 *
 * These are the four things a reader checks before trusting a standings page:
 * how current it is, how far into the season it is, how much is still to play
 * for, and what moves it next. Read as prose they were a paragraph of small
 * grey text under the title; read as a timing sheet they are four glances.
 */
function StandingsMeta({
  lastUpdated,
  lastRound,
  nextRound,
  pointsRemaining,
  roundsScored,
  roundsTotal,
}: {
  lastUpdated: number | null;
  lastRound: Championship['lastRound'];
  nextRound: Championship['nextRound'];
  pointsRemaining: number;
  roundsScored: number;
  roundsTotal: number;
}) {
  return (
    <dl className="mb-10 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border py-4 text-sm sm:grid-cols-4">
      {lastUpdated ? (
        <div>
          <dt className="gpp-label text-text-muted">Updated</dt>
          <dd className="mt-1 text-text">
            <time dateTime={new Date(lastUpdated).toISOString()}>
              {formatDateLong(lastUpdated, LAST_UPDATED_FORMAT)}
            </time>
          </dd>
        </div>
      ) : null}

      <div>
        <dt className="gpp-label text-text-muted">Last round</dt>
        <dd className="mt-1 text-text">
          {lastRound ? lastRound.name : `Round ${roundsScored}`}
          <span className="gpp-mono mt-0.5 block text-xs text-text-muted">
            Round {lastRound?.round ?? roundsScored}
            {roundsTotal > 0 ? ` of ${roundsTotal}` : ''}
          </span>
        </dd>
      </div>

      {pointsRemaining > 0 ? (
        <div>
          <dt className="gpp-label text-text-muted">Points left</dt>
          <dd className="gpp-mono mt-1 text-text">{pointsRemaining}</dd>
        </div>
      ) : null}

      {nextRound ? (
        <div>
          <dt className="gpp-label text-text-muted">Next race</dt>
          <dd className="mt-1">
            <Link
              to="/races/$raceSlug"
              params={{ raceSlug: nextRound.slug }}
              // Underlined rather than accent colour alone: chartreuse on the
              // page background does not reach 3:1 against the text beside it.
              className="text-accent underline underline-offset-4"
            >
              {nextRound.name}
            </Link>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

/** Ties and mid-season moves, stated under the table they affect. */
function StandingsNotes({
  notes,
}: {
  notes: readonly { id?: string; text: string }[];
}) {
  if (notes.length === 0) {
    return null;
  }
  return (
    <ul className="mt-3 space-y-1 text-xs text-text-muted">
      {notes.map((note) => (
        <li key={note.text} id={note.id}>
          {note.text}
        </li>
      ))}
    </ul>
  );
}

function DriversSection({ standings }: { standings: Championship }) {
  const [gapMode, setGapMode] = useState<GapMode>('leader');
  const { drivers, roundsScored, season } = standings;

  const footnoteIds = new Map<string, string>();
  const notes: { id?: string; text: string }[] = [];

  for (const group of tieGroups(drivers, (driver) => driver.displayName)) {
    const names = `${group.names.slice(0, -1).join(', ')} and ${group.names.at(-1)}`;
    notes.push({
      text: `${names} are level on ${group.points} points. ${
        group.note ?? 'The countback cannot separate them.'
      }`,
    });
  }

  for (const driver of drivers) {
    const note = teamHistoryNote(driver);
    if (!note) {
      continue;
    }
    const id = `drivers-note-${driver.driverId}`;
    footnoteIds.set(driver.driverId as string, id);
    notes.push({ id, text: `† ${note}` });
  }

  const rounds = chartRounds(
    standings.calendar,
    drivers[0]?.pointsByRound.map((row) => row.round) ?? [],
  );
  const leader = drivers[0];
  const second = drivers[1];

  return (
    <section aria-labelledby="drivers-championship">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="drivers-championship"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <Trophy className="h-5 w-5 text-accent" />
          Drivers' Championship
        </h2>
        <GapModeToggle
          id="drivers-gap-mode"
          value={gapMode}
          onChange={setGapMode}
          aheadLabel="Car ahead"
        />
      </div>

      <DriverStandingsTable
        drivers={drivers}
        season={season}
        roundsScored={roundsScored}
        gapMode={gapMode}
        footnoteIds={footnoteIds}
      />
      <StandingsNotes notes={notes} />

      <StandingsChartsSection
        idPrefix="drivers"
        unit="driver"
        gapSeries={driverSeries(drivers, CHART_LIMITS.gap)}
        lineSeries={driverSeries(drivers, CHART_LIMITS.progression)}
        bumpSeries={driverSeries(drivers, CHART_LIMITS.bump)}
        rounds={rounds}
        summaries={{
          gap:
            leader && second
              ? `Points scored by the top ${CHART_LIMITS.gap} drivers. ${leader.displayName} leads ${second.displayName} by ${second.gapToLeader} points after ${roundsScored} rounds.`
              : `Points scored by the leading drivers after ${roundsScored} rounds.`,
          progression: `Championship points after every round for the top ${CHART_LIMITS.progression} drivers, ${leader ? `led by ${leader.displayName}` : 'this season'}.`,
          bump: `Championship position after every round for the top ${CHART_LIMITS.bump} drivers.`,
        }}
      />
    </section>
  );
}

function ConstructorsSection({ standings }: { standings: Championship }) {
  const [gapMode, setGapMode] = useState<GapMode>('leader');
  const { constructors, drivers, roundsScored, season } = standings;

  const notes: { id?: string; text: string }[] = [];
  for (const group of tieGroups(constructors, (team) =>
    displayTeamName(team.team),
  )) {
    const names = `${group.names.slice(0, -1).join(', ')} and ${group.names.at(-1)}`;
    notes.push({
      text: `${names} are level on ${group.points} points. ${
        group.note ?? 'The countback cannot separate them.'
      }`,
    });
  }
  if (drivers.some((driver) => driver.teamHistory.length > 1)) {
    notes.push({
      text: 'A driver who changes team mid-season keeps his own points, but each round of them stays with the team he scored it for. That is why a driver total and a team total do not always add up.',
    });
  }

  const rounds = chartRounds(
    standings.calendar,
    constructors[0]?.pointsByRound.map((row) => row.round) ?? [],
  );
  const leader = constructors[0];
  const second = constructors[1];
  const series = constructorSeries(constructors);

  return (
    <section aria-labelledby="constructors-championship">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2
          id="constructors-championship"
          className="flex items-center gap-2 text-lg font-semibold text-text"
        >
          <Flag className="h-5 w-5 text-accent" />
          Constructors' Championship
        </h2>
        <GapModeToggle
          id="constructors-gap-mode"
          value={gapMode}
          onChange={setGapMode}
          aheadLabel="Team ahead"
        />
      </div>

      <ConstructorStandingsTable
        constructors={constructors}
        season={season}
        roundsScored={roundsScored}
        gapMode={gapMode}
      />
      <StandingsNotes notes={notes} />

      <StandingsChartsSection
        idPrefix="constructors"
        unit="team"
        gapSeries={series}
        lineSeries={series}
        bumpSeries={series}
        rounds={rounds}
        summaries={{
          gap:
            leader && second
              ? `Points scored by every team. ${displayTeamName(leader.team)} lead ${displayTeamName(second.team)} by ${second.gapToLeader} points after ${roundsScored} rounds.`
              : `Points scored by every team after ${roundsScored} rounds.`,
          progression: `Championship points after every round for all ${constructors.length} teams.`,
          bump: `Championship position after every round for all ${constructors.length} teams.`,
        }}
      />
    </section>
  );
}

function F1StandingsPage() {
  const { standings: initialStandings } = Route.useLoaderData();
  // Also the observer that keeps the loader's cache entry subscribed; without
  // it the entry would sit unwatched behind an infinite stale time.
  const { data: liveStandings } = useQuery(
    routeQuery(api.f1Standings.getF1Championship, {
      season: SEASON,
      includeHistory: true,
    }),
  );
  const standings = liveStandings ?? initialStandings;
  const {
    drivers,
    lastRound,
    lastUpdated,
    nextRound,
    pointsRemaining,
    roundsScored,
    roundsTotal,
    season,
  } = standings;
  const hasResults = drivers.length > 0 && roundsScored > 0;
  const summary = summarySentence(standings);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          title={`${season} F1 Championship Standings`}
          subtitle={
            summary ??
            `The ${season} Formula 1 World Championship standings for drivers and constructors, scored from official race and sprint results.`
          }
        />

        {hasResults ? (
          <StandingsMeta
            lastUpdated={lastUpdated}
            lastRound={lastRound}
            nextRound={nextRound}
            pointsRemaining={pointsRemaining}
            roundsScored={roundsScored}
            roundsTotal={roundsTotal}
          />
        ) : null}

        {hasResults ? (
          <>
            <nav
              aria-label="Championship tables"
              className="mb-10 flex gap-x-5 text-sm text-text-muted"
            >
              <a
                href="#drivers-championship"
                className="underline-offset-4 hover:text-text hover:underline"
              >
                Drivers
              </a>
              <a
                href="#constructors-championship"
                className="underline-offset-4 hover:text-text hover:underline"
              >
                Constructors
              </a>
            </nav>

            <div className="space-y-14">
              <DriversSection standings={standings} />
              {standings.constructors.length > 0 && (
                <ConstructorsSection standings={standings} />
              )}
            </div>
          </>
        ) : (
          <NoticeCard
            description={`No ${season} results have been published yet. Championship standings will appear here after the first Grand Prix.`}
          />
        )}

        {/* `FaqSection` centres itself in its own narrower column, which
            steps the questions in from the tables above them. The page column
            is the right one here, so this section is local. */}
        <section aria-labelledby="standings-faq" className="my-10">
          <h2
            id="standings-faq"
            className="mb-1 text-lg font-semibold text-text"
          >
            Formula 1 standings questions
          </h2>
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} question={faq.question}>
              <p className="text-text-muted">{faq.answer}</p>
            </FaqItem>
          ))}
        </section>

        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          <Link
            to="/f1-qualifying-standings"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {SEASON} qualifying championship
          </Link>
          <Link
            to="/f1-2027-driver-line-up"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            2027 driver line-up
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
