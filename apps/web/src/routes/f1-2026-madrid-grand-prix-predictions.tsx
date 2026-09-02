import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { Flag } from '@/components/Flag';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendWeatherForecast } from '@/components/weather/WeekendWeatherForecast';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  lastReviewedAt,
  reviewedIsoDate,
  reviewedStamp,
} from '@/lib/lastReviewed';
import { routeQuery } from '@/lib/routeQuery';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { getRaceWriteup, getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import {
  breadcrumbSchema,
  pageMeta,
  raceOgImageUrl,
  siteConfig,
  sportsEventSchema,
} from '@/lib/site';

import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

/** The date the hand-written prose on this page was last checked. */
const PROSE_REVIEWED = getRaceWriteupReviewedAt('madrid-2026');

const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const PATH = '/f1-2026-madrid-grand-prix-predictions';
const RACE_SLUG = 'madrid-2026';
const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/spain';
const CORNER_SOURCE =
  'https://www.the-race.com/formula-1/madrid-f1-track-spanish-gp-standout-corner-la-monumental-our-verdict/';
const TEST_SOURCE =
  'https://www.grandprix.com/news/madring-praise-red-flags-first-formula-3-test-2026.html';
const FILMING_SOURCE =
  'https://www.madring.com/en/press-releases/ferrari-estrena-madring';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compounds-selected-for-zandvoort-monza-and-madrid/';

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
type SeasonRace = FunctionReturnType<
  typeof api.races.listCurrentSeason
>['races'][number];

/*
 * Durable questions only. Weekend analysis belongs in the sections above, and
 * news belongs in `raceNews`, where it retires with the weekend.
 */
const FAQS = [
  {
    question: 'When is the 2026 Spanish Grand Prix in Madrid?',
    answer:
      'The Spanish Grand Prix runs from 11 to 13 September 2026 at the Madring in Madrid. Qualifying is on Saturday and the 57-lap Grand Prix is on Sunday.',
  },
  {
    question: 'Is this the same race as the Barcelona-Catalunya Grand Prix?',
    answer:
      'No. 2026 has two races in Spain. The Barcelona-Catalunya Grand Prix was in June. This round is the Spanish Grand Prix, in Madrid.',
  },
  {
    question: 'Has Formula 1 raced at the Madring before?',
    answer:
      'No. This is the circuit’s debut. Madrid last held a Grand Prix at Jarama in 1981.',
  },
  {
    question: 'Are other players’ picks visible before the session?',
    answer:
      'No. Picks stay private until the relevant session locks, so nobody can copy another player’s Top 5 before making their own call.',
  },
  {
    question: 'How are Spanish Grand Prix predictions scored?',
    answer:
      'An exact Top 5 position earns 5 points, one position away earns 3, and selecting a driver who finishes elsewhere in the actual Top 5 earns 1 point.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-madrid-grand-prix-predictions')({
  component: MadridGrandPrixPredictionsPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();
    const weatherNow = Date.now();
    const [race, championship, weather, news, season] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
      ),
      // Live. This weekend is a week after Monza, so a table written before
      // that race is scored would be wrong by the time anyone reads it.
      context.queryClient.ensureQueryData(
        routeQuery(api.f1Standings.getF1Championship, {}),
      ),
      context.queryClient.ensureQueryData(
        routeQuery(api.weather.getByRaceSlug, {
          raceSlug: RACE_SLUG,
          now: weatherNow,
        }),
      ),
      context.queryClient.ensureQueryData(
        routeQuery(api.raceNews.list, { raceSlug: RACE_SLUG }),
      ),
      context.queryClient.ensureQueryData(
        routeQuery(api.races.listCurrentSeason, {}),
      ),
    ]);
    if (!race) {
      throw notFound();
    }
    return { race, championship, weather, weatherNow, news, season };
  },
  head: ({ loaderData }) => {
    const race = loaderData?.race;
    const title = '2026 Spanish Grand Prix Predictions & Picks | Madrid';
    const description =
      race?.status === 'finished'
        ? '2026 Spanish Grand Prix predictions scored against the official Madring classification. See who read the new Madrid circuit right in its first year.'
        : race?.status === 'cancelled'
          ? 'The 2026 Spanish Grand Prix was called off.'
          : '2026 Spanish Grand Prix predictions for Madrid’s Madring. Nobody has raced here, so practice is the form guide. Pick a top 5 for qualifying and the race.';
    const circuit = getCircuitForRace(RACE_SLUG);
    const meta = pageMeta({
      title,
      description,
      path: PATH,
      image: raceOgImageUrl(RACE_SLUG),
      imageAlt:
        'Grand Prix Picks race card for the 2026 Spanish Grand Prix at the Madring in Madrid.',
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
                name: title,
                description,
                dateModified: reviewedIsoDate(PROSE_REVIEWED_AT),
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
                ...(race && circuit
                  ? {
                      about: sportsEventSchema({
                        name: '2026 Spanish Grand Prix',
                        startAt: race.raceStartAt,
                        path: PATH,
                        description,
                        image: raceOgImageUrl(RACE_SLUG),
                        location: circuit,
                        cancelled: race.status === 'cancelled',
                      }),
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
                { name: 'Races', path: '/races' },
                { name: 'Spanish Grand Prix predictions', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function MadridGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);
  const pendingRaces = racesStillToScoreBefore(
    season.races,
    championship.roundsScored,
    race.round,
  );

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="gpp-stripe grid gap-8 overflow-hidden rounded-sm bg-surface px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              <Flag code="ES" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">
                  11–13 SEP · MADRING · ROUND {race.round}
                </p>
                <span className="text-text-disabled" aria-hidden>
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Spanish Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Spanish Grand Prix',
                'Nobody has raced here. Practice is the form guide.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              raceSlug={RACE_SLUG}
              venueName="Madrid"
              circuitName="Madring"
              circuitSlug="madring"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Europe/Madrid"
            timeZoneLabel="MADRID TIME"
          />
        </div>

        {isLive ? (
          <WeekendWeatherForecast
            race={race}
            weather={weather}
            now={weatherNow}
          />
        ) : null}

        <NoFormGuide />
        <LaMonumental />
        <WatchTable />
        <TyreChoice />
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <ChampionshipContext
              championship={championship}
              pendingRaces={pendingRaces}
              venueName="Madrid"
            />
          </>
        ) : null}

        <section className="py-8 sm:py-16" aria-labelledby="common-questions">
          <h2
            id="common-questions"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Common questions
          </h2>
          <div className="mt-6 max-w-3xl divide-y divide-border border-y border-border">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="cursor-pointer list-none font-medium text-text marker:content-none">
                  {faq.question}
                </summary>
                <p className="gpp-reading-copy mt-3 text-text-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <RaceWriteupClosingPanel
          phase={phase}
          raceSlug={RACE_SLUG}
          venueName="Madrid"
        />

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Race facts and schedule:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Corner detail:{' '}
            <ExternalSource href={CORNER_SOURCE}>The Race</ExternalSource>. F3
            test:{' '}
            <ExternalSource href={TEST_SOURCE}>Grandprix.com</ExternalSource>.
            Ferrari filming:{' '}
            <ExternalSource href={FILMING_SOURCE}>Madring</ExternalSource>.
            Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
          </p>
          <p className="gpp-mono mt-2 text-xs">
            LAST REVIEWED {reviewedStamp(PROSE_REVIEWED_AT)}
          </p>
        </footer>
      </div>
    </div>
  );
}

/**
 * The thing that actually separates this weekend from every other one, and the
 * reason the page leads with it rather than with the layout.
 */
function NoFormGuide() {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="no-form-guide"
    >
      <div>
        <h2
          id="no-form-guide"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          There is no form guide for this one
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Every other round has a result from last year. This one doesn&rsquo;t.
          Formula 1 has never raced at the Madring.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Season form still matters. The gap between two similar cars is
          guesswork until Friday.
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {[
          ['Circuit', 'Madring, Madrid'],
          ['Layout', '5.416 km, 22 corners'],
          ['Race', '57 laps'],
          ['F1 history', 'None. Debut in 2026'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-4 last:border-0"
          >
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The one corner with a genuine predictive consequence, which is why it gets a
 * section rather than a line in the layout table. The setup compromise it
 * forces is the closest thing this weekend has to a known variable.
 *
 * Length is 550 m, matching F1's feature, Madring's own notes and the circuit
 * guide. Degree-of-arc figures disagree (270° in one F1 feature, semicircular
 * on the event page, "almost 180" from Sainz), so they stay off the page.
 */
function LaMonumental() {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="la-monumental"
    >
      <div>
        <h2
          id="la-monumental"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          La Monumental is a setup problem
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Turn 12 is a banked right-hander of 550 metres at 24 percent, the
          longest banked corner on the calendar. Estimates put mid-corner around
          250 kph, with about 4G for a couple of seconds.{' '}
          <ExternalSource href={CORNER_SOURCE}>
            The Race on La Monumental
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Run the car low and it is fast everywhere but risks floor damage or a
          plank infringement through the banking. Run it high and the rest of
          the lap is slower. F3 cars were reported to be touching the surface
          there in testing.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          A car that looks quick in FP1 and then raises the ride height has
          given something up for Sunday.
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {[
          ['Corner', 'Turn 12, La Monumental'],
          ['Length', '550 m'],
          ['Banking', '24 percent'],
          ['Load', 'About 4G, estimated'],
          ['Decides', 'Ride height'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-4 last:border-0"
          >
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function WatchTable() {
  const rows = [
    [
      'Friday running',
      'The first time the whole grid is here',
      'Ferrari has already filmed, on demonstration tyres. Everyone else starts from zero.',
    ],
    [
      'Ride height changes',
      'Cars sitting higher in FP3 than FP1',
      'A team that raised the car has chosen safety through the banking over lap time.',
    ],
    [
      'The tight sector',
      'Traction and braking around the exhibition halls',
      'The street-style section rewards a settled rear, and it is where a lap is lost.',
    ],
    [
      'Long-run pace',
      'Lap after lap at the same pace',
      'A new surface makes tyre behaviour over a stint harder to guess.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="what-to-watch">
      <h2
        id="what-to-watch"
        className="font-title text-2xl font-medium text-text sm:text-3xl"
      >
        What to watch in practice
      </h2>

      <dl className="mt-7 grid grid-cols-1 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([title, what, why]) => (
          <div key={title} className="bg-surface p-5">
            <dt className="font-title text-sm font-medium text-text">
              {title}
            </dt>
            <dd className="mt-2 text-sm text-text-muted">{what}</dd>
            <dd className="gpp-reading-copy mt-2 text-sm text-text-muted">
              {why}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const TYRE_RANGE = [
  { compound: 'C1', role: null, band: null },
  { compound: 'C2', role: 'hard', band: '#f0f0f0' },
  { compound: 'C3', role: 'medium', band: '#ffd500' },
  { compound: 'C4', role: 'soft', band: '#da291c' },
  { compound: 'C5', role: null, band: null },
] as const;

function TyreChoice() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="tyre-choice">
      <div className="max-w-3xl">
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Tyre choice
        </p>
        <h2
          id="tyre-choice"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          Madrid gets the medium tyres
        </h2>

        <ul
          aria-label="Pirelli’s 2026 compound range, hardest to softest"
          className="mt-7 grid grid-cols-5 gap-px overflow-hidden rounded-sm bg-border"
        >
          {TYRE_RANGE.map(({ compound, role, band }) => (
            <li
              key={compound}
              className={
                role
                  ? 'border-t-[3px] bg-surface px-2 py-4 sm:px-5 sm:py-5'
                  : 'border-t-[3px] border-dashed border-border bg-surface-sunken px-2 py-4 sm:px-5 sm:py-5'
              }
              style={band ? { borderTopColor: band } : undefined}
            >
              <p
                className={`gpp-mono text-xl sm:text-2xl ${role ? 'text-text' : 'text-text-muted'}`}
              >
                {compound}
              </p>
              <p
                className={
                  role
                    ? 'mt-1 text-[10px] tracking-label text-text-muted uppercase sm:text-xs'
                    : 'sr-only'
                }
              >
                {role ?? 'Not used at Madrid'}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex justify-between gap-4 text-[10px] tracking-label text-text-muted uppercase sm:text-xs">
          <span>Lasts longer</span>
          <span>More grip</span>
        </div>

        <p className="gpp-reading-copy mt-7 text-text-muted">
          Pirelli&rsquo;s simulations put the loads near Silverstone and Spa, so
          they left the C5 at home to limit overheating and to push a two-stop.{' '}
          <ExternalSource href={TYRE_SOURCE}>
            Read Pirelli&rsquo;s selection
          </ExternalSource>
          .
        </p>
      </div>
    </section>
  );
}

function ChampionshipContext({
  championship,
  pendingRaces,
  venueName,
}: {
  championship: Championship;
  pendingRaces: readonly SeasonRace[];
  venueName: string;
}) {
  const drivers = championship.drivers.slice(0, 6);
  const leader = drivers[0];
  const second = drivers[1];
  if (!leader || !second) {
    return null;
  }
  const gap = leader.points - second.points;

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
                <PendingRacesCopy races={pendingRaces} venueName={venueName} />
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

function racesStillToScoreBefore(
  races: readonly SeasonRace[],
  roundsScored: number,
  thisRound: number,
): SeasonRace[] {
  return races
    .filter(
      (race) =>
        race.round > roundsScored &&
        race.round < thisRound &&
        race.status !== 'cancelled',
    )
    .sort((a, b) => a.round - b.round);
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

function PendingRacesCopy({
  races,
  venueName,
}: {
  races: readonly SeasonRace[];
  venueName: string;
}) {
  return (
    <>
      The{' '}
      {races.map((race, index) => (
        <span key={race.slug}>
          {index > 0
            ? index === races.length - 1
              ? ' and the '
              : ', the '
            : null}
          <RaceNameLink race={race} />
        </span>
      ))}{' '}
      still {races.length === 1 ? 'has' : 'have'} to be scored, so this table
      will change before {venueName}.
    </>
  );
}

function ExternalSource({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-block font-semibold whitespace-nowrap text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
