import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';

import { DriverBadge } from '@/components/DriverBadge';
import { Flag } from '@/components/Flag';
import {
  DeferredRaceWriteupPicks,
  RACE_WRITEUP_PICKS_ANCHOR,
} from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { CircuitStatStrip } from '@/components/race-writeups/CircuitStatStrip';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceSignalsSection } from '@/components/race-writeups/RaceSignalsSection';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupActions } from '@/components/race-writeups/RaceWriteupActions';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupNextRound } from '@/components/race-writeups/RaceWriteupNextRound';
import { RaceWriteupPhaseLabel } from '@/components/race-writeups/RaceWriteupPhaseLabel';
import { RaceWriteupTrackMap } from '@/components/race-writeups/RaceWriteupTrackMap';
import { RaceWriteupWeekendSchedule } from '@/components/race-writeups/RaceWriteupWeekendSchedule';
import { SessionConsensusSections } from '@/components/SessionConsensus';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { WriteUpNewsPhoto } from '@/components/WriteUpNewsPhoto';
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
import {
  FORMULA_THREE_WRITEUP_IMAGE,
  JARAMA_WRITEUP_IMAGE,
  PIRELLI_MEDIUM_WRITEUP_IMAGE,
} from '@/lib/madrid2026WriteUpImages';
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
const PROSE_REVIEWED = getRaceWriteupReviewedAt('madrid-2026');

const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const PATH = '/f1-2026-madrid-grand-prix-predictions';
const RACE_SLUG = 'madrid-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'What to watch in practice';
const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/spain';
const CORNER_SOURCE =
  'https://www.the-race.com/formula-1/madrid-f1-track-spanish-gp-standout-corner-la-monumental-our-verdict/';
const TEST_SOURCE =
  'https://www.grandprix.com/news/madring-praise-red-flags-first-formula-3-test-2026.html';
const FILMING_SOURCE =
  'https://www.madring.com/en/press-releases/ferrari-estrena-madring';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compounds-selected-for-zandvoort-monza-and-madrid/';
const F3_OFFICIAL_SOURCE =
  'https://www.fiaformula3.com/en/latest/article/fia-formula-3-to-hold-official-tests-at-madring-in-august-as-the-2026-f3-season-finale-expands-with-additional-feature-race.1VGQYdEuNMGEGVM51PyEDH';
const RED_FLAG_SOURCE =
  'https://www.planetf1.com/news/madring-spanish-grand-prix-2026-red-flags';
const LAP_TIME_SOURCE =
  'https://www.pitdebrief.com/post/2026-f3-in-season-testing-madrid-2/';
const THEFT_SOURCE =
  'https://www.grandprix.com/news/police-investigate-cable-theft-at-madring.html';
const BUILD_SOURCE =
  'https://www.racingcircuits.info/europe/spain/madring.html';
const JARAMA_SOURCE =
  'https://www.motorsportmagazine.com/articles/single-seaters/f1/gilles-villeneuves-1981-spanish-caravan-he-won-with-a-dog-of-a-car/';
const LAYOUT_SOURCE =
  'https://www.the-race.com/formula-1/madrid-f1-circuit-layout-revealed/';
const SAINZ_SOURCE =
  'https://www.planetf1.com/news/carlos-sainz-lands-new-role-ahead-of-key-f1-2026-arrival';

type Championship = FunctionReturnType<
  typeof api.f1Standings.getF1Championship
>;
type StandingsDriver = Championship['drivers'][number];

/*
 * Durable questions only. Weekend analysis belongs in the sections above, and
 * news belongs in `raceNews`, where it retires with the weekend.
 *
 * Two entries were removed for being about the game rather than about this
 * race: how scoring works, and whether picks are visible before a session
 * locks. Both are answered on `/how-to-play` and `/results-policy`, both are
 * linked from the sections that raise them, and repeating them here on every
 * write-up is the cross-page duplication `docs/seo-content-policy.md` exists
 * to stop. Six questions this page can answer beat eight where two belong to
 * another page.
 */
const FAQS = [
  {
    question: 'When is the 2026 Spanish Grand Prix in Madrid?',
    answer:
      'The Spanish Grand Prix runs from 11 to 13 September 2026 at the Madring in Madrid. Qualifying is on Saturday and the 57-lap Grand Prix is on Sunday.',
  },
  {
    question:
      'Is the Madrid Grand Prix the same race as the Spanish Grand Prix?',
    answer:
      'Yes. Madrid Grand Prix is the common shorthand for the 2026 Spanish Grand Prix at the Madring. It is separate from the Barcelona-Catalunya Grand Prix, which was held in June.',
  },
  {
    question: 'Has Formula 1 raced at the Madring before?',
    answer:
      'No. This is the circuit’s debut. Madrid last held a Grand Prix at Jarama in 1981.',
  },
  {
    question: 'Is the Madring ready for the Spanish Grand Prix?',
    answer:
      'The circuit was signed off by the FIA for Formula 1 on 23 June 2026, and Formula 3 completed a two-day test on it in August. Around 300 metres of cable was stolen from a tunnel section on 31 August and Spanish police are investigating, but the race schedule is unchanged.',
  },
  {
    question: 'What did the Formula 3 test show about the Madring?',
    answer:
      'Thirty drivers ran over two days in August and the test produced 19 red flags, 11 of them cars in the barriers. Ugo Ugochukwu set the fastest lap at 1:49.034. Those lap times say nothing about Formula 1 pace, but the corners that caught drivers are the same corners.',
  },
  {
    question: 'How likely is a safety car at the Madring?',
    answer:
      'There is no Formula 1 history to count from. The lap is walled for long stretches and the Formula 3 test stopped 19 times in two days, so treat the chance of a safety car as higher than at a permanent circuit.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-madrid-grand-prix-predictions')({
  component: MadridGrandPrixPredictionsPage,
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
      context.queryClient.ensureQueryData(
        routeQuery(api.practiceResults.getPracticeResultsForRaceSlug, {
          raceSlug: RACE_SLUG,
        }),
      ),
      // How the field picked each session that has locked: the one thing on
      // this page no other publication can print. It joins this wave rather
      // than waiting to learn a session has locked, because it is keyed on
      // the slug alone, answers empty all week, and has to be in the SSR
      // HTML — a client subscription would hide it from the crawler that
      // this page exists for. The backend returns nothing before a lock, so
      // it can never become an answer sheet.
      context.queryClient.ensureQueryData(
        routeQuery(api.consensus.getWeekendConsensusForRaceSlug, {
          raceSlug: RACE_SLUG,
        }),
      ),
      // Read only once this weekend is done, but keyed on nothing, so it
      // costs this wave no round trip it was not already making.
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
    const title = '2026 Madrid Grand Prix Predictions | Spanish GP Picks';
    const description =
      race?.status === 'finished'
        ? '2026 Madrid Grand Prix predictions scored against the official Spanish Grand Prix classification. See who read the new Madring circuit right in its first year.'
        : race?.status === 'cancelled'
          ? 'The 2026 Spanish Grand Prix was called off.'
          : '2026 Madrid Grand Prix predictions for the Spanish Grand Prix at the Madring, the first Formula 1 race at Madrid\u2019s new circuit.';
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
                      about: {
                        ...sportsEventSchema({
                          name: '2026 Spanish Grand Prix',
                          startAt: race.raceStartAt,
                          path: PATH,
                          description,
                          image: raceOgImageUrl(RACE_SLUG),
                          location: circuit,
                          cancelled: race.status === 'cancelled',
                        }),
                        alternateName: '2026 Madrid Grand Prix',
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
                { name: 'Madrid Grand Prix predictions', path: PATH },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function MadridGrandPrixPredictionsPage() {
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
  // Madrid is a regular weekend, so the sessions that can carry a consensus
  // are qualifying and the race, in the order they run. Each one appears the
  // moment it locks rather than waiting for the race to be scored: a reader
  // picking their race Top 5 on Saturday evening can see what the field did
  // with qualifying, which is the half of the game their own entry cannot
  // show them.
  const consensusSessions = (['quali', 'race'] as const).flatMap((session) => {
    const sessionConsensus = consensus[session];
    return sessionConsensus ? [{ session, consensus: sessionConsensus }] : [];
  });
  // Read off the standings rather than hard-coded, so a seat change during the
  // season cannot leave this section naming a driver at their old team.
  const spanishDrivers = championship.drivers.filter(
    (driver) => driver.nationality === 'ES',
  );

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="grid gap-8 border-b border-border pb-8 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <header>
            <div className="flex items-center gap-3">
              <Flag code="ES" size="xl" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <p className="gpp-mono text-sm text-text-muted uppercase">
                  11–13 Sep · Madring · Round {race.round}
                </p>
                {/* Only where the eyebrow fits on one line. A phone wraps
                    before the phase label, and a separator is punctuation
                    between two things on the same line: dropped to the next
                    one it becomes a dot opening a sentence, which is what the
                    hero read as at 390px. The line break separates them. */}
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
              2026 Spanish Grand Prix predictions
            </h1>
            <p className="gpp-reading-copy-lg mt-5 max-w-2xl text-text-muted">
              {raceWriteupHeroSummary(
                phase,
                'The Spanish Grand Prix',
                'Formula 1 has never raced at the Madring. It is a walled city lap with the longest banked corner on the calendar, and Formula 3 put eleven cars into the barriers testing on it.',
              )}
            </p>
            <RaceWriteupActions
              phase={phase}
              primaryActionTargetId={
                isLive ? RACE_WRITEUP_PICKS_ANCHOR : undefined
              }
              raceSlug={RACE_SLUG}
              venueName="Madrid"
              signalsHeading={SIGNALS_HEADING}
            />
          </header>

          <RaceWriteupWeekendSchedule
            race={race}
            timeZone="Europe/Madrid"
            timeZoneLabel="Madrid time"
            weather={isLive ? weather : null}
            now={weatherNow}
          />
        </div>

        <FormulaThreeTest />
        {/* What changed this week, then what the cars did, then what the field
            made of it. All three date from this weekend, and all three used to
            sit below five sections of circuit analysis that will read the same
            in a year: a reader on Friday met 1981 before they met today. The
            durable material follows, which is also the order it stops
            mattering in. */}
        {isLive ? (
          <>
            <WeekendNewsSection items={news.items} />
            <WeekendPracticeSection results={practice} raceSlug={RACE_SLUG} />
          </>
        ) : null}
        {/* Not gated on the phase. It appears session by session as each one
            locks and it is still the best thing on the page once the race is
            done, so the gate it needs is "has anything locked", which is the
            question the empty list already answers. */}
        <SessionConsensusSections sessions={consensusSessions} />
        <TrackMap />
        <LaMonumental />
        <WatchTable />
        <TyreChoice />
        {/* The build and the theft answer "will this happen at all", which
            stops being a question the moment the race runs. The F3 test and
            the Spanish drivers stay: both are still true in the archive. */}
        {isLive ? <TrackReadiness /> : null}
        <SpanishDrivers drivers={spanishDrivers} />
        {isLive ? (
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Madrid"
          />
        ) : null}

        <RaceFaqSection faqs={FAQS} />

        {/* The picks finish on this page while there are picks to make. The
            closing panel's button leaves for the race page, which is the right
            answer for a weekend that is over and the wrong one for the round a
            reader arrived here to play. */}
        {isLive ? (
          <DeferredRaceWriteupPicks
            phase={phase}
            raceId={race._id}
            round={race.round}
            season={race.season}
            raceSlug={RACE_SLUG}
            venueName="Madrid"
          />
        ) : (
          <>
            <RaceWriteupClosingPanel
              phase={phase}
              raceId={race._id}
              raceSlug={RACE_SLUG}
              venueName="Madrid"
            />
            <RaceWriteupNextRound nextRace={nextRace} />
          </>
        )}

        <footer className="mt-10 pb-4 text-sm leading-6 text-text-muted">
          <p>
            Race facts and schedule:{' '}
            <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
            Corner detail:{' '}
            <ExternalSource href={CORNER_SOURCE}>The Race</ExternalSource>. Lap
            layout:{' '}
            <ExternalSource href={LAYOUT_SOURCE}>The Race</ExternalSource>. F3
            test:{' '}
            <ExternalSource href={TEST_SOURCE}>Grandprix.com</ExternalSource>.
            Ferrari filming:{' '}
            <ExternalSource href={FILMING_SOURCE}>Madring</ExternalSource>.
            Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
            F3 test format:{' '}
            <ExternalSource href={F3_OFFICIAL_SOURCE}>
              FIA Formula 3
            </ExternalSource>
            . Test red flags:{' '}
            <ExternalSource href={RED_FLAG_SOURCE}>PlanetF1</ExternalSource>.
            Test times:{' '}
            <ExternalSource href={LAP_TIME_SOURCE}>Pit Debrief</ExternalSource>.
            Cable theft:{' '}
            <ExternalSource href={THEFT_SOURCE}>Grandprix.com</ExternalSource>.
            Construction and homologation:{' '}
            <ExternalSource href={BUILD_SOURCE}>
              RacingCircuits.info
            </ExternalSource>
            . Ambassador role:{' '}
            <ExternalSource href={SAINZ_SOURCE}>PlanetF1</ExternalSource>.
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
 * The only on-track evidence that exists for this circuit, and therefore the
 * section that answers the one above.
 *
 * The red flag count is the fact worth carrying: it is not colour, it is the
 * closest thing this weekend has to a safety car probability. Formula 3 is not
 * Formula 1, so the copy claims the shape of the risk rather than a number.
 *
 * The figures are the shared four-up strip, across the foot of the section,
 * rather than the labelled card in a right-hand column they used to be. That
 * card had two problems. It ran five rows against three paragraphs, so it and
 * the photo below it made a column half as tall again as the copy beside them,
 * and the section ended on a wide patch of empty page. And three of its five
 * rows restated the sentence next to them in smaller type: the test dates, the
 * entry, the red flag count. A figure earns its place here by being scannable,
 * which is a reason to make it large, not a reason to repeat a sentence.
 *
 * The fifth row, "Carries over: where it bites", said nothing at a glance. It
 * was compressing the third paragraph's argument into three words and losing
 * it. The paragraph makes the point; the strip counts.
 *
 * Ugochukwu gets his flag, because a driver's name carries one everywhere else
 * on this site and he is not exempt for racing in a different championship.
 */
function FormulaThreeTest() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="f3-test">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <h2
            id="f3-test"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            The only laps anyone has run here
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Formula 3 spent two days at the Madring on 24 and 25 August, 30
            drivers across 10 teams, and stopped 19 times. Eleven of those were
            cars in the barriers.{' '}
            <ExternalSource href={F3_OFFICIAL_SOURCE}>
              The FIA&rsquo;s test announcement
            </ExternalSource>
            .
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            The crashes were spread rather than concentrated. Turns 5 to 7
            through the chicane and Turn 17 caught the most, and the exit of
            Turn 3 and Turn 14 caught drivers too.{' '}
            <ExternalSource href={RED_FLAG_SOURCE}>
              PlanetF1 on the red flags
            </ExternalSource>
            .
          </p>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            Formula 1 will be far quicker than any of that, and will meet the
            same walls. Nineteen stoppages in two days is the closest thing this
            weekend has to a safety car forecast.
          </p>
        </div>
        {/* The one picture on this page whose subject is the thing the section
            is about: the car that has actually run here is a Formula 3 car. */}
        <div className="self-start">
          <WriteUpNewsPhoto {...FORMULA_THREE_WRITEUP_IMAGE} />
        </div>
      </div>
      <CircuitStatStrip
        stats={[
          ['19', 'Red flags'],
          ['11', 'Into the barriers'],
          ['30', 'Drivers, 10 teams'],
          [
            '1:49.034',
            <>
              <Flag code="US" size="xs" />
              Fastest: Ugochukwu
            </>,
          ],
        ]}
      />
    </section>
  );
}

/**
 * Live-only. "Is the circuit finished" is a real question for a venue this new
 * and a search people are running this week, and it stops being either the
 * moment the race runs.
 *
 * The theft is the reason a reader arrives at this section, so it opens rather
 * than sitting second behind the homologation dates. The surface age is the
 * reason the section changes a pick, and it closes.
 */
function TrackReadiness() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="track-readiness">
      <div className="max-w-3xl">
        <h2
          id="track-readiness"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          Somebody stole 300 metres of the circuit&rsquo;s cable
        </h2>
        <p className="gpp-reading-copy mt-5 text-text-muted">
          It went on Sunday 31 August, cut from generators powering site
          installations in a tunnel section of the track. Spanish police are
          investigating and nobody has been arrested. None of it has moved the
          race schedule.{' '}
          <ExternalSource href={THEFT_SOURCE}>
            Grandprix.com on the theft
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The circuit itself has been ready for months. The last layer of
          asphalt went down on 31 May and the FIA signed it off for Formula 1 on
          23 June. Everything built since is grandstands, hospitality and
          temporary infrastructure.{' '}
          <ExternalSource href={BUILD_SOURCE}>
            RacingCircuits.info on the build
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          The asphalt is three months old and has barely been driven on. It will
          be green on Friday morning and quicker every session as Formula 2 and
          Formula 3 lay rubber down. First practice will not look much like
          Saturday.
        </p>
      </div>
    </section>
  );
}

/** Turn numbers as printed on the lap map, paired with the name in the prose. */
const CORNERS = [
  ['5–6', 'Chicane'],
  ['12', 'La Monumental'],
  ['16–22', 'Exhibition halls'],
] as const;

/**
 * The corner numbers the rest of the page uses, drawn once.
 *
 * Three sections name turns by number (the F3 crash corners, La Monumental,
 * the tight run through the halls) and no reader has ever seen this lap, so
 * the map goes above the section that leans on it hardest rather than at the
 * foot of the page. La Monumental is the one corner here with a name anybody
 * has published; the other two legend entries describe a stretch of lap the
 * prose already talks about, rather than inventing names nobody will use on
 * Sunday.
 */
function TrackMap() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="track-map">
      <div className="max-w-3xl">
        <h2
          id="track-map"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What the lap looks like
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Sector 1 is the long run from Turn 1 to Turn 5. Sector 2 carries the
          banking at Turn 12. Sector 3 is the tight section through the
          exhibition halls.
        </p>
      </div>

      {/* Full width rather than beside a column of copy. The other write-up
          runs a photograph next to its map; the only picture this page has is
          Jarama, and it belongs with 1981. */}
      <div className="mt-7">
        <RaceWriteupTrackMap
          src="/media/madrid-track-map-1600.webp"
          srcSet="/media/madrid-track-map-800.webp 800w, /media/madrid-track-map-1600.webp 1600w"
          sizes="(min-width: 1024px) 60rem, 100vw"
          width={1600}
          height={893}
          circuitName="Madring"
          corners={CORNERS}
          controlCorner="bottom-right"
          alt="Madring lap map. Turns are numbered 1 to 22, with the three sectors, the start/finish line between Turn 22 and Turn 1, the two straight mode zones, the speed trap in sector 1, and the Overtake detection and activation points at the end of the lap."
        />
      </div>
    </section>
  );
}

/**
 * The one corner with a genuine predictive consequence, which is why it gets a
 * section rather than a line in the layout table. The compromise it forces is
 * the closest thing this weekend has to a known variable.
 *
 * Written for someone watching, not someone building the car. The old version
 * opened "Run the car low and..." in the imperative, which addresses a race
 * engineer; the reader is a fan who wants to know why a team would give up lap
 * time, so the copy explains what a worn plank costs rather than naming a
 * plank infringement and moving on.
 *
 * Length is 550 m, matching F1's feature, Madring's own notes and the circuit
 * guide. Degree-of-arc figures disagree (270° in one F1 feature, semicircular
 * on the event page, "almost 180" from Sainz), so they stay off the page.
 *
 * Prose alone, like the two sections above it. The five-row card that used to
 * sit beside this repeated the corner, its length, its banking and its load
 * from the paragraph next to it, and closed on "Decides: ride height", which
 * is the third paragraph compressed past the point of meaning. The banking
 * figure a reader should be able to scan is already a tile in "What to watch
 * in practice".
 */
function LaMonumental() {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="la-monumental">
      <div className="max-w-3xl">
        <h2
          id="la-monumental"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          Everyone has to compromise for Turn 12
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          La Monumental is a banked right-hander, 550 metres of it at 24
          percent, the longest banked corner in Formula 1. Estimates put
          mid-corner speed around 250 kph and the load on the car at about 4G
          for a couple of seconds.{' '}
          <ExternalSource href={CORNER_SOURCE}>
            The Race on La Monumental
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          All that load presses the car into the road, and that is where the
          compromise starts. A car running low is quicker over the lap, but its
          floor can touch down through the banking, and a worn plank is a
          disqualification. Sit the car higher and Turn 12 is safe while the
          other 21 corners are slower. Formula 3 cars were reported to be
          scraping the surface there in testing, and they generate nowhere near
          the downforce of a Formula 1 car.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Ride height is the tell. A team that raises the car between Friday and
          Saturday has decided Turn 12 is not worth the lap time.
        </p>
      </div>
    </section>
  );
}

/**
 * The same section every other write-up carries, drawn by the same component.
 *
 * This was a hand-rolled four-up card grid saying what `RaceSignalsSection`
 * says, which meant Madrid was the one write-up whose signals read as a
 * different component and the one with no circuit figures above them. The
 * numbers were on the page already, scattered through three asides; the strip
 * is where a reader who skims goes looking for them.
 *
 * Two signals were cut for saying what a section beside them already says:
 * "Ride height changes" was the closing line of "Everyone has to compromise
 * for Turn 12", and "Long-run pace" was the green-surface paragraph in "The
 * track is finished". A reader who has scrolled past both meets them twice and
 * starts skimming. What replaced them is the one thing the page had nowhere
 * else: where a driver can actually pass.
 */
function WatchTable() {
  return (
    <RaceSignalsSection
      heading={SIGNALS_HEADING}
      stats={[
        ['5.416', 'km circuit'],
        ['22', 'corners'],
        ['57', 'race laps'],
        ['24%', 'banking at Turn 12'],
      ]}
      signals={[
        [
          'Friday running',
          'The first time the whole grid is here',
          'Nobody arrives with data. Even Ferrari’s filming day was 100 km a driver on demonstration tyres.',
        ],
        [
          'The tight sector',
          'Traction and braking around the exhibition halls',
          'A car that steps out on the exits loses more here than anywhere else on the lap.',
        ],
        [
          'Where a pass is possible',
          'Braking into the chicane at Turns 5 and 6',
          'The Race calls it comfortably the best overtaking spot on the lap, and there is no obvious second one.',
        ],
      ]}
    />
  );
}

function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Madrid gets the medium tyres"
      venue="Madrid"
      hardest="C2"
      aside={<WriteUpNewsPhoto {...PIRELLI_MEDIUM_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Pirelli&rsquo;s simulations put the loads here close to Silverstone and
        Spa, so it left the softest compound at home: on a hot weekend the C5
        would overheat. It stopped at the middle of the range rather than going
        harder because C2, C3 and C4 is the set it expects to need two stops.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Read Pirelli&rsquo;s selection
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}

/**
 * Two Spanish drivers and a 45-year gap, which is the fact this weekend is
 * actually about outside the game.
 *
 * The 1981 race leads because it is the interesting half of "Madrid last held
 * a Grand Prix in 1981": a date on its own is trivia, and Villeneuve holding
 * off four faster cars for a 1.24-second top five is the reason anyone
 * remembers Jarama. The closing line used to tell a reader not to move a
 * driver up their Top 5 for the crowd, which is neither about this circuit nor
 * about that race; what survives of it is the one concrete thing the
 * ambassador role buys, which is simulator time.
 *
 * The list is filtered off the standings rather than written down, so a
 * mid-season seat change cannot leave this paragraph naming an old team, and
 * the closing line exists because a home race is exactly the sort of thing a
 * player talks themselves into moving up a Top 5.
 */
function SpanishDrivers({ drivers }: { drivers: readonly StandingsDriver[] }) {
  if (drivers.length === 0) {
    return null;
  }

  return (
    <section
      className="grid gap-7 py-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-labelledby="spanish-drivers"
    >
      <div>
        <h2
          id="spanish-drivers"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          Villeneuve won the last Grand Prix held in Madrid
        </h2>
        <p className="gpp-reading-copy mt-4 text-text-muted">
          The last one was at Jarama, north of the city, in June 1981. Gilles
          Villeneuve&rsquo;s Ferrari was quick in a straight line and awful
          everywhere else, so he built his gap on the straight and blocked for
          the rest of the lap. Eighty laps of that, four faster cars stacked up
          behind him, and he won by 0.22 seconds with the top five covered by
          1.24.{' '}
          <ExternalSource href={JARAMA_SOURCE}>
            Motor Sport on the drive
          </ExternalSource>
          .
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Formula 1 has not been back to Madrid in the 45 years since. Barcelona
          held the Spanish Grand Prix from 1991 until last season and now runs
          as the Barcelona-Catalunya Grand Prix, so Spain has two rounds in
          2026.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Carlos Sainz has been the Madring&rsquo;s ambassador since 2025 and
          said at its presentation that he would be racing 20 minutes from home.
          He has also had a year to learn the layout in a simulator, which
          nobody else on the grid has.{' '}
          <ExternalSource href={SAINZ_SOURCE}>
            PlanetF1 on the ambassador role
          </ExternalSource>
          .
        </p>
      </div>
      {/* The card is two rows against three paragraphs of copy, so the column
          ends well short of the section. The photo takes the rest of it, the
          way the Monza track map carries one beneath its aside. */}
      <div className="self-start">
        <div className="border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h3 className="font-title flex items-center gap-2 font-medium text-text">
              <Flag code="ES" size="sm" />
              Spanish drivers
            </h3>
          </div>
          <ul aria-label="Spanish drivers on the 2026 grid">
            {drivers.map((driver) => (
              <li
                key={driver.driverId}
                className="flex items-center gap-2 border-b border-border/60 px-4 py-3 last:border-b-0"
              >
                <DriverBadge
                  code={driver.code}
                  team={driver.team}
                  displayName={driver.displayName}
                  number={driver.number}
                  nationality={driver.nationality}
                  size="sm"
                  prerenderTooltip={false}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {driver.displayName}
                </span>
                <span className="gpp-mono text-xs text-text-muted">
                  P{driver.position}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <WriteUpNewsPhoto {...JARAMA_WRITEUP_IMAGE} />
      </div>
    </section>
  );
}
