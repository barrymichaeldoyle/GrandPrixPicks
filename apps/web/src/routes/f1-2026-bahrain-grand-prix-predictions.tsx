import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';

import { Flag } from '@/components/Flag';
import {
  DeferredRaceWriteupPicks,
  RACE_WRITEUP_PICKS_ANCHOR,
} from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceSignalsSection } from '@/components/race-writeups/RaceSignalsSection';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { RaceNameLink } from '@/components/race-writeups/RaceNameLink';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupNextRound } from '@/components/race-writeups/RaceWriteupNextRound';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { SessionConsensusSections } from '@/components/SessionConsensus';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
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
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
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

/**
 * The circuit section's heading. Declared once so the section cannot drift
 * from the name the rest of the page uses for it.
 */
const SIGNALS_HEADING = 'What matters at Sepang';
const F1_STANDINGS_SOURCE = 'https://www.formula1.com/en/results/2026/drivers';
const F1_EVENT_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-confirm-malaysia-will-join-2026-calendar-as-host-venue-for-bahrain-grand-prix.6lL7vjFEM2VVynRHvg1TCf';
const RELOCATION_SOURCE =
  'https://www.skysports.com/f1/news/12433/13566600/malaysia-added-to-2026-f1-calendar-in-october-to-host-postponed-bahrain-gp-amid-continued-conflict-in-middle-east';
const COMMERCIAL_SOURCE = 'https://www.bernama.com/en/news.php?id=2586986';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const PIRELLI_DATA_SOURCE =
  'https://www.autosport.com/f1/news/how-pirelli-will-deal-with-f1s-unexpected-return-to-sepang/10843289/';
/** Dromo resurfaced Sepang in 2016 and relaid Turns 7 to 12 in 2023. */
const SURFACE_SOURCE =
  'https://www.studiodromo.it/portfolio/sepang-international-circuit/';
const START_TIME_SOURCE =
  'https://www.news.gp/en/fia-confirms-start-time-for-relocated-bahrain-grand-prix';

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
      'In 2017. Sepang held the Malaysian Grand Prix from 1999 to 2017, and this is the first Formula 1 race there since. The track has changed in that time: Dromo resurfaced it in 2016, the year before that last race, and relaid Turns 7 to 12 in 2023.',
  },
  {
    question: 'Is the 2026 Bahrain Grand Prix the Malaysian Grand Prix?',
    answer:
      'No. Formula 1 last held a Malaysian Grand Prix at Sepang in 2017. This round keeps the Bahrain Grand Prix name and is being held at Sepang after the Sakhir race was called off.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-bahrain-grand-prix-predictions')(
  {
    component: BahrainGrandPrixPredictionsPage,
    loader: async ({ context }) => {
      await setRaceDataCacheHeaders();
      const weatherNow = Date.now();
      const [
        race,
        championship,
        weather,
        news,
        season,
        practice,
        consensus,
        nextRace,
      ] = await Promise.all([
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
        context.queryClient.ensureQueryData(
          routeQuery(api.practiceResults.getPracticeResultsForRaceSlug, {
            raceSlug: RACE_SLUG,
          }),
        ),
        // How the field picked each session that has locked: the one thing
        // on this page no other publication can print. It has to be in the
        // SSR HTML — a client subscription would hide it from the crawler
        // this page exists for. The backend returns nothing before a lock.
        context.queryClient.ensureQueryData(
          routeQuery(api.consensus.getWeekendConsensusForRaceSlug, {
            raceSlug: RACE_SLUG,
          }),
        ),
        context.queryClient.ensureQueryData(
          routeQuery(api.races.getNextRace, {}),
        ),
      ]);
      if (!race) {
        throw notFound();
      }
      return {
        race,
        championship,
        weather,
        weatherNow,
        news,
        season,
        practice,
        consensus,
        nextRace,
      };
    },
    head: ({ loaderData }) => {
      const race = loaderData?.race;
      const title = '2026 Bahrain Grand Prix Predictions | Sepang';
      const description =
        race?.status === 'finished'
          ? '2026 Bahrain Grand Prix predictions scored against the official Sepang classification. See who called the top 5 for qualifying and the race.'
          : race?.status === 'cancelled'
            ? 'The 2026 Bahrain Grand Prix was called off.'
            : '2026 Bahrain Grand Prix predictions at Sepang in Malaysia. Pick a top 5 for qualifying and the race at a circuit the 2026 cars have never run.';
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
                        about: {
                          ...sportsEventSchema({
                            name: '2026 Bahrain Grand Prix',
                            startAt: race.raceStartAt,
                            path: PATH,
                            description,
                            image: raceOgImageUrl(RACE_SLUG),
                            location: circuit,
                            cancelled: race.status === 'cancelled',
                          }),
                          alternateName: '2026 Sepang Grand Prix',
                        },
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
  const {
    race,
    championship,
    weather,
    weatherNow,
    news,
    season,
    practice,
    consensus,
    nextRace,
  } = Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);
  const consensusSessions = (['quali', 'race'] as const).flatMap((session) => {
    const sessionConsensus = consensus[session];
    return sessionConsensus ? [{ session, consensus: sessionConsensus }] : [];
  });

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="grid gap-8 border-b border-border pb-8 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              {/* Bahrain's flag on a race run in Malaysia is not a bug. The
                  race keeps its identity and the circuit is a separate fact,
                  which is exactly the split `circuits.ts` exists to hold. The
                  eyebrow names Sepang so the two are never read as one. */}
              <Flag code="BH" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted">
                  02–04 Oct · Sepang · Round {race.round}
                </p>
                <span
                  className="hidden text-text-disabled sm:inline"
                  aria-hidden
                >
                  ·
                </span>
                <RaceWriteupPhaseLabel phase={phase} />
              </div>
            </div>
            <h1 className="font-title mt-4 max-w-3xl text-4xl font-light tracking-tight text-text sm:text-5xl">
              2026 Bahrain Grand Prix predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Bahrain Grand Prix',
                'Formula 1 last raced at Sepang in 2017. The 2026 cars have never run here, and this year\u2019s Bahrain Grand Prix is being held in Malaysia.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              primaryActionTargetId={
                isLive ? RACE_WRITEUP_PICKS_ANCHOR : undefined
              }
              raceSlug={RACE_SLUG}
              venueName="Sepang"
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Asia/Kuala_Lumpur"
            timeZoneLabel="Sepang time"
            weather={isLive ? weather : null}
            now={weatherNow}
          />
        </div>

        <WhyMalaysia />
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <WeekendPracticeSection results={practice} raceSlug={RACE_SLUG} />
          </>
        ) : null}
        <SessionConsensusSections sessions={consensusSessions} />
        <NoCurrentForm />
        <WatchTable />
        <TyreChoice />
        <TripleHeader season={season} />
        {isLive ? (
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Sepang"
            sourceUrl={F1_STANDINGS_SOURCE}
          />
        ) : null}

        <RaceFaqSection faqs={FAQS} />

        {isLive ? (
          <DeferredRaceWriteupPicks
            phase={phase}
            raceId={race._id}
            round={race.round}
            season={race.season}
            raceSlug={RACE_SLUG}
            venueName="Sepang"
          />
        ) : (
          <>
            <RaceWriteupClosingPanel
              phase={phase}
              raceId={race._id}
              raceSlug={RACE_SLUG}
              venueName="Sepang"
            />
            <RaceWriteupNextRound nextRace={nextRace} />
          </>
        )}

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
            . Track surface:{' '}
            <ExternalSource href={SURFACE_SOURCE}>Dromo</ExternalSource>.
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
        <h2
          id="why-malaysia"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
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
            Bernama on how the race is funded
          </ExternalSource>
          .{' '}
          <ExternalSource href={RELOCATION_SOURCE}>
            Sky Sports on the calendar change
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          This is round 16 at Sepang. Scoring is the same as every other round.
          The layout is two long straights and a fast middle sector.
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
 *
 * This section, the tyre copy, the signals table and an FAQ answer all used to
 * say the circuit had not been resurfaced since 2017. None of it was true and
 * none of it was in the Autosport piece cited beside it. Dromo resurfaced
 * Sepang in 2016, the year *before* that last Grand Prix, and relaid Turns 7
 * to 12 in 2023 — the middle sector, which is exactly the part the first
 * signal is about. The 2016 surface was also laid for wet grip, so "abrasive"
 * was working against the only description anyone has published of it.
 */
function NoCurrentForm() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="no-current-form">
      <div className="max-w-3xl">
        <h2
          id="no-current-form"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
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
          current ones, which is the closest thing to a reference anyone has.{' '}
          <ExternalSource href={PIRELLI_DATA_SOURCE}>
            How Pirelli is using 2017 data
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The asphalt has changed since those 2017 laps were set. Dromo
          resurfaced the circuit in 2016 and relaid Turns 7 to 12 in 2023, so
          the middle sector is seven years newer than the rest of the lap.{' '}
          <ExternalSource href={SURFACE_SOURCE}>
            Dromo on the work it did
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Simulations built on old data are the starting point for every team.
          Friday is the first chance to correct them.
        </p>
      </div>
    </section>
  );
}

function WatchTable() {
  return (
    <RaceSignalsSection
      heading={SIGNALS_HEADING}
      stats={[
        ['5.543', 'km circuit'],
        ['56', 'race laps'],
        ['15', 'turns'],
        ['15:00', 'local start'],
      ]}
      signals={[
        [
          'The middle sector',
          'Pace through the fast, constant-radius corners',
          'Sepang is wide and quick between the hairpins. A car that carries aerodynamic load through those long corners is quick across the rest of the lap.',
        ],
        [
          'Tyre management',
          'Long-run degradation, and whether it changes across the lap',
          'The 2016 surface was laid for wet grip, and Turns 7 to 12 were relaid in 2023. A driver who is quick over one lap may not hold a stint together.',
        ],
        [
          'The hairpins',
          'Stability at the end of both long straights',
          'Both of the main passing places are heavy, wide stops. A car that brakes well can make a move there.',
        ],
        [
          'Heat and rain',
          'Cooling, and what happens if a tropical shower arrives',
          'Afternoon rain is common at Sepang. A wet or drying race spreads the field further than dry pace would.',
        ],
      ]}
    >
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Two long straights joined by a hairpin, and a middle sector of fast,
        wide corners. Passing is easier here than at most circuits, so
        qualifying sets less of the Sunday order. Afternoon showers also arrive
        quickly.
      </p>
    </RaceSignalsSection>
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
function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Sepang gets the middle three tyres"
      venue="Sepang"
      hardest="C2"
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        C2, C3 and C4, one step harder than the C3, C4 and C5 going to Baku and
        Singapore either side of this weekend. That is the same set, in current
        names, that Pirelli brought to the last race here.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli picked the middle of the range to keep a one-stop and a two-stop
        close. Teams are likely to disagree about how many stops to make, and
        that can decide a result on a circuit where passing is possible.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s compound selection
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
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
        <h2
          id="triple-header"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
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
          heat here has Singapore a week later. Singapore is a sprint weekend,
          with four sessions instead of two.
        </p>
      </div>

      {neighbours.length > 0 ? (
        <ol className="mt-7 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-3">
          {neighbours.map((race) => (
            <li key={race.slug} className="bg-surface p-4 sm:p-5">
              <p className="gpp-mono text-xs text-text-muted uppercase">
                Round {race.round}
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
