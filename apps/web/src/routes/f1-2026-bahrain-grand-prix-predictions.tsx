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
const PROSE_REVIEWED = getRaceWriteupReviewedAt('bahrain-2026');

const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const PATH = '/f1-2026-bahrain-grand-prix-predictions';
const RACE_SLUG = 'bahrain-2026';
const F1_EVENT_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-confirm-malaysia-will-join-2026-calendar-as-host-venue-for-bahrain-grand-prix.6lL7vjFEM2VVynRHvg1TCf';
const RELOCATION_SOURCE =
  'https://www.skysports.com/f1/news/12433/13566600/malaysia-added-to-2026-f1-calendar-in-october-to-host-postponed-bahrain-gp-amid-continued-conflict-in-middle-east';
const COMMERCIAL_SOURCE = 'https://www.bernama.com/en/news.php?id=2586986';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const PIRELLI_DATA_SOURCE =
  'https://www.autosport.com/f1/news/how-pirelli-will-deal-with-f1s-unexpected-return-to-sepang/10843289/';
const START_TIME_SOURCE =
  'https://www.news.gp/en/fia-confirms-start-time-for-relocated-bahrain-grand-prix';

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
type SeasonRace = FunctionReturnType<
  typeof api.races.listCurrentSeason
>['races'][number];

/*
 * Durable questions only. Weekend analysis belongs in the sections above, and
 * news belongs in `raceNews`, where it retires with the weekend.
 *
 * The first question is the one this page exists to answer. It is the thing a
 * fan types into a search box when a Grand Prix named after one country turns
 * up in another, and no other page on the site can answer it: the race slug
 * says Bahrain, the circuit says Sepang, and the schedule says October.
 */
const FAQS = [
  {
    question: 'Why is the 2026 Bahrain Grand Prix being held in Malaysia?',
    answer:
      'The round was due to run at Sakhir in April and was called off on safety grounds, along with the Saudi Arabian Grand Prix. Formula 1, the FIA and the governments of Bahrain and Malaysia agreed to reinstate it at Sepang in October. It keeps the Bahrain Grand Prix name, and Bahrain sets the ticket prices and receives the ticket revenue.',
  },
  {
    question: 'When is the 2026 Bahrain Grand Prix?',
    answer:
      'The weekend runs from 2 to 4 October 2026 at Sepang. Qualifying is on Saturday and the 56-lap Grand Prix starts at 15:00 Malaysian time on Sunday.',
  },
  {
    question: 'When did Formula 1 last race at Sepang?',
    answer:
      'In 2017. Sepang held the Malaysian Grand Prix from 1999 to 2017, and this is the first Formula 1 race there since. The circuit has not been resurfaced in that time.',
  },
  {
    question: 'How are Bahrain Grand Prix predictions scored?',
    answer:
      'An exact Top 5 position earns 5 points, one position away earns 3, and selecting a driver who finishes elsewhere in the actual Top 5 earns 1 point.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-bahrain-grand-prix-predictions')(
  {
    component: BahrainGrandPrixPredictionsPage,
    loader: async ({ context }) => {
      await setRaceDataCacheHeaders();
      const weatherNow = Date.now();
      const [race, championship, weather, news, season] = await Promise.all([
        context.queryClient.ensureQueryData(
          routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
        ),
        // Live. This page is published well ahead of the weekend, so three
        // rounds are still to be scored before it and a hand-typed table would
        // be wrong long before anybody reads it in October.
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
      const title = '2026 Bahrain Grand Prix Predictions | Sepang';
      const description =
        race?.status === 'finished'
          ? '2026 Bahrain Grand Prix predictions, official Sepang results, and how they scored.'
          : race?.status === 'cancelled'
            ? 'The 2026 Bahrain Grand Prix was called off.'
            : 'The 2026 Bahrain Grand Prix runs at Sepang in Malaysia on 4 October. Nobody has raced a 2026 car here. Make your predictions.';
      const circuit = getCircuitForRace(RACE_SLUG);
      const meta = pageMeta({
        title,
        description,
        path: PATH,
        image: raceOgImageUrl(RACE_SLUG),
        imageAlt:
          'Grand Prix Picks race card for the 2026 Bahrain Grand Prix at Sepang in Malaysia.',
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
                  // The location is Sepang, not Sakhir. `getCircuitForRace`
                  // already resolves that override, which is the whole reason
                  // circuits are keyed separately from races.
                  ...(race && circuit
                    ? {
                        about: sportsEventSchema({
                          name: '2026 Bahrain Grand Prix',
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
                  { name: 'Bahrain Grand Prix predictions', path: PATH },
                ]),
              ],
            }),
          },
        ],
      };
    },
  },
);

function BahrainGrandPrixPredictionsPage() {
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
              {/* Bahrain's flag on a race run in Malaysia is not a bug. The
                  race keeps its identity and the circuit is a separate fact,
                  which is exactly the split `circuits.ts` exists to hold. The
                  eyebrow names Sepang so the two are never read as one. */}
              <Flag code="BH" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">
                  02–04 OCT · SEPANG · ROUND {race.round}
                </p>
                <span className="text-text-disabled" aria-hidden>
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              Bahrain Grand Prix 2026 predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Bahrain Grand Prix',
                'The Bahrain Grand Prix runs in Malaysia this year. Nobody has raced a 2026 car at Sepang, and heat and rain decide as much as pace.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              raceSlug={RACE_SLUG}
              venueName="Sepang"
              circuitName="Sepang"
              circuitSlug="sepang"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Asia/Kuala_Lumpur"
            timeZoneLabel="SEPANG TIME"
          />
        </div>

        {isLive ? (
          <WeekendWeatherForecast
            race={race}
            weather={weather}
            now={weatherNow}
          />
        ) : null}

        <WhyMalaysia />
        <NoCurrentForm />
        <WatchTable />
        <TyreChoice />
        <TripleHeader season={season} />
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <ChampionshipContext
              championship={championship}
              pendingRaces={pendingRaces}
              venueName="Sepang"
            />
            <PredictionMethod />
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
          venueName="Sepang"
        />

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Calendar change:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>{' '}
            and{' '}
            <ExternalSource href={RELOCATION_SOURCE}>Sky Sports</ExternalSource>
            . Funding and tickets:{' '}
            <ExternalSource href={COMMERCIAL_SOURCE}>Bernama</ExternalSource>.
            Start time:{' '}
            <ExternalSource href={START_TIME_SOURCE}>News.GP</ExternalSource>.
            Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
            Tyre data:{' '}
            <ExternalSource href={PIRELLI_DATA_SOURCE}>
              Autosport
            </ExternalSource>
            .
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
 * The reason anyone lands here from a search box, so it runs first.
 *
 * Kept to what a fan needs to understand the entry on the calendar: the round
 * was called off, an agreement moved it, the name and the money stayed with
 * Bahrain. The conflict behind the cancellation is named once, plainly, and
 * sourced. This is a predictions page and it does not have a view on the war.
 */
function WhyMalaysia() {
  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="why-malaysia"
    >
      <div>
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          The calendar change
        </p>
        <h2
          id="why-malaysia"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          A Bahrain Grand Prix in Malaysia
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          The Bahrain Grand Prix was the fourth round of the season, due at
          Sakhir from 10 to 12 April. It was called off on safety grounds
          following the outbreak of conflict in the region, as was the Saudi
          Arabian Grand Prix the week after.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Formula 1, the FIA and the governments of Bahrain and Malaysia then
          agreed to reinstate the race at Sepang in October. It keeps the
          Bahrain Grand Prix name, and Bahrain keeps the ticket pricing rights
          and the ticket revenue because it is paying the hosting fee.{' '}
          <ExternalSource href={COMMERCIAL_SOURCE}>
            Read how the race is funded
          </ExternalSource>
          .{' '}
          <ExternalSource href={RELOCATION_SOURCE}>
            Read the background
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          For your picks, only the venue matters. This is round 16 at Sepang, it
          scores like any other round, and the circuit is nothing like Sakhir.
        </p>
      </div>
      <dl className="self-start rounded-sm bg-surface-elevated px-4">
        {[
          ['Race name', 'Bahrain Grand Prix'],
          ['Venue', 'Sepang, Malaysia'],
          ['Originally', 'Sakhir, 10–12 April'],
          ['Now', '2–4 October, round 16'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-4 last:border-0"
          >
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="mt-2 text-sm text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The prediction consequence of the move, which is separate from the move.
 *
 * Sepang is not a new circuit, so the Madrid page's "nobody has raced here"
 * framing would be wrong. What is true is narrower and more useful: the
 * reference laps are nine years old and were set by a different formula.
 */
function NoCurrentForm() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="no-current-form">
      <div className="max-w-3xl">
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Form guide
        </p>
        <h2
          id="no-current-form"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          The last Formula 1 race here was in 2017
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Sepang held the Malaysian Grand Prix from 1999 to 2017. Nine years of
          regulation changes sit between that race and this one, and the 2026
          cars are new this season, so no driver on the grid has a lap here in
          anything resembling the car they will drive.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Pirelli is working from 2017 data for the same reason. Its motorsport
          director has said the 2017 tyre sizes are reasonably close to the
          current ones, which is the closest thing to a reference anyone has.
          The circuit has not been resurfaced since, and the asphalt was already
          abrasive.{' '}
          <ExternalSource href={PIRELLI_DATA_SOURCE}>
            Read how Pirelli prepared
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Practice is worth more here than at a circuit the teams visit every
          year. Simulations built on old data are the starting point for
          everyone, and Friday is where they get corrected.
        </p>
      </div>
    </section>
  );
}

function WatchTable() {
  const rows = [
    [
      'Aero load at speed',
      'Pace through the fast, constant-radius corners',
      'Sepang is wide and quick in the middle sector. A car that carries load through long corners gains everywhere.',
    ],
    [
      'Tyre management',
      'Long-run degradation on abrasive asphalt',
      'The surface is nine years old and rough. A driver who is quick over one lap may not hold a stint together.',
    ],
    [
      'Braking into the hairpins',
      'Stability at the end of both long straights',
      'Both of the main passing places are heavy, wide stops. Cars that stop well can pass here rather than follow.',
    ],
    [
      'Heat and rain',
      'Cooling, and what happens if a tropical shower arrives',
      'Afternoon rain is common. A wet or drying race spreads the field further than pace alone would.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="what-to-watch">
      <div className="max-w-3xl">
        <h2
          id="what-to-watch"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What matters at Sepang
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Two long straights joined by a hairpin, and a middle sector of fast,
          wide corners. Passing is easier here than at most circuits, so
          qualifying decides less than it usually does.
        </p>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-4">
        {[
          ['5.543', 'km circuit'],
          ['56', 'race laps'],
          ['15', 'turns'],
          ['15:00', 'local start'],
        ].map(([value, label]) => (
          <div
            key={label}
            className="flex flex-col-reverse bg-surface p-4 sm:p-5"
          >
            <dt className="mt-1 text-xs tracking-label text-text-muted uppercase">
              {label}
            </dt>
            <dd className="gpp-mono text-2xl text-text">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <div
          className="hidden grid-cols-[10rem_1fr_1fr] gap-8 px-4 pb-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:grid sm:px-5"
          aria-hidden
        >
          <span>Signal</span>
          <span>Look for</span>
          <span>Why it matters</span>
        </div>
        <div className="rounded-sm bg-surface px-4 sm:px-5">
          {rows.map(([check, signal, reason]) => (
            <div
              key={check}
              className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[10rem_1fr_1fr] sm:gap-8"
            >
              <h3 className="font-title text-sm font-medium text-text">
                {check}
              </h3>
              <p className="text-sm leading-6 text-text">{signal}</p>
              <p className="text-sm leading-6 text-text-muted">{reason}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The 2026 slick range, hardest first, with Sepang's three marked.
 *
 * Same component idea as the Monza page. The interesting fact here is the
 * position of the nomination rather than the nomination itself: Sepang takes
 * the middle three while the two street races on either side of it take the
 * softest three, which is what makes the strip worth drawing.
 */
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
          Sepang gets the middle three tyres
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
                {role ?? 'Not used at Sepang'}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex justify-between gap-4 text-[10px] tracking-label text-text-muted uppercase sm:text-xs">
          <span>Lasts longer</span>
          <span>More grip</span>
        </div>

        <p className="gpp-reading-copy mt-7 text-text-muted">
          C2, C3 and C4, one step harder than the C3, C4 and C5 going to Baku
          and Singapore either side of this weekend. Sepang puts medium loads
          through a tyre, but the asphalt is abrasive and has not been
          resurfaced since 2017.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Pirelli picked the middle of the range to narrow the gap between a
          one-stop and a two-stop, which is a choice made to open up strategy
          rather than settle it. Expect teams to disagree about the number of
          stops, and expect that to matter more than usual on a circuit where
          passing is possible.{' '}
          <ExternalSource href={TYRE_SOURCE}>
            Read Pirelli&rsquo;s selection
          </ExternalSource>
          .
        </p>
      </div>
    </section>
  );
}

/**
 * Where this weekend sits in the run of three, with links out to the
 * neighbours.
 *
 * The links are the point as much as the prose: this page is published weeks
 * ahead of the race and the two beside it are the natural next click, so the
 * write-up registry resolves them when they exist and the race pages carry
 * them until then.
 */
function TripleHeader({
  season,
}: {
  season: { races: readonly SeasonRace[] };
}) {
  const neighbours = season.races
    .filter((race) => race.round >= 15 && race.round <= 17)
    .sort((a, b) => a.round - b.round);

  return (
    <section className="py-8 sm:py-16" aria-labelledby="triple-header">
      <div className="max-w-3xl">
        <p className="gpp-mono text-xs tracking-label text-text-muted uppercase">
          Three weekends
        </p>
        <h2
          id="triple-header"
          className="font-title mt-3 text-2xl font-medium text-text sm:text-3xl"
        >
          The middle race of a triple-header
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Sepang was slotted between Azerbaijan and Singapore, so the teams run
          three races in three weekends and travel from Baku to Malaysia to
          Singapore. Two of the three are hot and humid, and the third is a
          street circuit.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Reliability and damage carry across a run like this. A car that breaks
          in Baku may take a penalty here, and a driver who struggles with the
          heat here has Singapore a week later. Singapore is also a sprint
          weekend, so it has four sessions to pick rather than two.
        </p>
      </div>

      {neighbours.length > 0 ? (
        <ol className="mt-7 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-3">
          {neighbours.map((race) => (
            <li key={race.slug} className="bg-surface p-4 sm:p-5">
              <p className="gpp-mono text-xs text-text-muted">
                ROUND {race.round}
              </p>
              <p className="font-title mt-2 font-medium text-text">
                <RaceNameLink race={race} />
              </p>
            </li>
          ))}
        </ol>
      ) : null}
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

function PredictionMethod() {
  const steps = [
    [
      'Treat old Sepang form as background',
      'A 2017 result tells you about a circuit, not about a 2026 car. Use it for the shape of the lap and nothing else.',
    ],
    [
      'Watch Friday long runs closely',
      'Degradation on this surface is the biggest unknown of the weekend, and it separates a one-stop from a two-stop.',
    ],
    [
      'Discount qualifying a little',
      'Both long straights end in wide braking zones, so drivers can recover here in a way they cannot at Monaco or Singapore.',
    ],
    [
      'Leave room for rain',
      'Tropical showers arrive fast in the afternoon. Consider who has held up in a wet race this season before you settle the back of your Top 5.',
    ],
  ] as const;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="build-top-five">
      <h2
        id="build-top-five"
        className="font-title text-2xl font-medium text-text"
      >
        Before you lock your Top 5
      </h2>
      <ul className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {steps.map(([title, detail]) => (
          <li key={title}>
            <h3 className="font-title font-medium text-text">{title}</h3>
            <p className="gpp-reading-copy mt-1 text-text-muted">{detail}</p>
          </li>
        ))}
      </ul>
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
