import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';

import { DriverBadge } from '@/components/DriverBadge';
import { Flag } from '@/components/Flag';
import { CircuitStatStrip } from '@/components/race-writeups/CircuitStatStrip';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceSignalsSection } from '@/components/race-writeups/RaceSignalsSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupFinish } from '@/components/race-writeups/RaceWriteupFinish';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import { RaceWriteupSection } from '@/components/race-writeups/RaceWriteupSection';
import { RaceWriteupTrackMap } from '@/components/race-writeups/RaceWriteupTrackMap';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { SessionConsensusSections } from '@/components/SessionConsensus';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { WriteUpNewsPhoto } from '@/components/WriteUpNewsPhoto';
import { lastReviewedAt } from '@/lib/lastReviewed';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import {
  FORMULA_THREE_WRITEUP_IMAGE,
  JARAMA_WRITEUP_IMAGE,
  PIRELLI_MEDIUM_WRITEUP_IMAGE,
} from '@/lib/madrid2026WriteUpImages';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import { routeQuery } from '@/lib/routeQuery';

import { RACE_WRITEUP_PICKS_ANCHOR } from '@/components/race-writeups/DeferredRaceWriteupPicks';

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
const VERSTAPPEN_SIM_SOURCE =
  'https://racingnews365.com/max-verstappen-predicts-big-shunts-at-madrid-f1-weekend';
const SAINZ_WEDNESDAY_SOURCE =
  'https://www.local10.com/sports/2026/09/09/sainz-expects-fun-but-intense-new-track-as-spanish-gp-returns-to-madrid-to-sold-out-crowd/';
const MADRID_ATTENDANCE_SOURCE =
  'https://www.madring.com/notas-prensa/madring-ya-esta-listo';
const WILLIAMS_UPGRADE_SOURCE =
  'https://cadenaser.com/nacional/2026/09/09/carlos-sainz-tengo-ganas-de-probar-el-madring-que-diria-que-es-parecido-a-baku-y-a-yeda-cadena-ser/';
const WEATHER_SOURCE =
  'https://www.formula1.com/en/latest/article/what-is-the-weather-forecast-for-the-2026-spanish-grand-prix.5TA3WMRX4zHfd8MWH0KjtI';
const TEST_SOURCE =
  'https://www.grandprix.com/news/madring-praise-red-flags-first-formula-3-test-2026.html';
const FILMING_SOURCE =
  'https://www.madring.com/en/press-releases/ferrari-estrena-madring';
const TYRE_SOURCE =
  'https://press.pirelli.com/the-madring-makes-its-world-championship-debut-with-the-challenge-of-the-monumental/';
const F3_OFFICIAL_SOURCE =
  'https://www.fiaformula3.com/en/latest/article/fia-formula-3-to-hold-official-tests-at-madring-in-august-as-the-2026-f3-season-finale-expands-with-additional-feature-race.1VGQYdEuNMGEGVM51PyEDH';
const RED_FLAG_SOURCE =
  'https://www.planetf1.com/news/madring-spanish-grand-prix-2026-red-flags';
const VOWLES_SOURCE =
  'https://www.grandprix.com/news/vowles-warns-madring-could-be-car-wrecking.html';
const SAINZ_LABEL_SOURCE =
  'https://www.grandprix.com/news/sainz-questions-madring-car-killer-description.html';
const LAP_TIME_SOURCE =
  'https://www.pitdebrief.com/post/2026-f3-in-season-testing-madrid-2/';
const THEFT_SOURCE =
  'https://www.grandprix.com/news/police-investigate-cable-theft-at-madring.html';
const BUILD_SOURCE =
  'https://www.racingcircuits.info/europe/spain/madring.html';
const WILLIAMS_LIVERY_SOURCE =
  'https://www.williamsf1.com/articles/10ecea73-d25f-42fe-9208-6728bb35f0bd/atlassian-and-williams-f1-team-drive-a-legacy-of-teamwork-forwards-with-special-madrid-race';
const JARAMA_SOURCE =
  'https://www.motorsportmagazine.com/articles/single-seaters/f1/gilles-villeneuves-1981-spanish-caravan-he-won-with-a-dog-of-a-car/';
const LAYOUT_SOURCE =
  'https://www.the-race.com/formula-1/madrid-f1-circuit-layout-revealed/';
const SAINZ_SOURCE =
  'https://www.planetf1.com/news/carlos-sainz-lands-new-role-ahead-of-key-f1-2026-arrival';
const HAMILTON_SOURCE =
  'https://www.motorsportweek.com/2026/07/17/lewis-hamilton-ferrari-madrid-f1-test/';
const MONZA_RESULT_SOURCE =
  'https://www.formula1.com/en/latest/article/antonelli-beats-russell-to-italian-grand-prix-win-with-stunning-comeback-drive.15WtFEBT5JEe4drdeO88t2';
const F1_STANDINGS_SOURCE = 'https://www.formula1.com/en/results/2026/drivers';

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
      'The circuit was signed off by the FIA for Formula 1 on 23 June 2026, and Formula 3 completed a two-day test on it in August. Around 300 metres of cable was stolen from a tunnel section on Sunday 30 August and Spanish police are investigating, but the race schedule is unchanged.',
  },
  {
    question: 'What did the Formula 3 test show about the Madring?',
    answer:
      'Formula 3 ran at the Madring on 24 and 25 August and the test produced 19 red flags, 11 of them cars in the barriers. Ugo Ugochukwu set the fastest lap at 1:49.034. The test highlighted several difficult corners, though Formula 3 lap times cannot tell us how the Formula 1 teams will compare.',
  },
  {
    question: 'How likely is a safety car at the Madring?',
    answer:
      'There is no Formula 1 race history here to base a probability on. Barriers line much of the lap, and the Formula 3 test had frequent stoppages. Safety cars are a possibility, but that test does not tell us how often they will be needed in a Grand Prix.',
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
  head: ({ loaderData }) =>
    raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: '2026 Spanish Grand Prix Predictions | Madrid',
      description: {
        live: '2026 Spanish Grand Prix predictions at the Madring in Madrid. Pick a top 5 for qualifying and the race at the circuit\u2019s Formula 1 debut.',
        finished:
          '2026 Spanish Grand Prix predictions scored against the official Madring classification. See who called the top 5 for qualifying and the race.',
        cancelled: 'The 2026 Spanish Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Spanish Grand Prix at the Madring in Madrid.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Spanish Grand Prix',
      eventAlternateName: '2026 Madrid Grand Prix',
      breadcrumbName: 'Spanish Grand Prix predictions',
      race: loaderData?.race,
      faqs: FAQS,
    }),
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
    <RaceWriteupPage
      reviewedAt={PROSE_REVIEWED_AT}
      sources={
        <>
          Race facts and schedule:{' '}
          <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
          Corner detail:{' '}
          <ExternalSource href={CORNER_SOURCE}>The Race</ExternalSource>. Lap
          layout: <ExternalSource href={LAYOUT_SOURCE}>The Race</ExternalSource>
          . F3 test:{' '}
          <ExternalSource href={TEST_SOURCE}>Grandprix.com</ExternalSource>.
          Ferrari filming:{' '}
          <ExternalSource href={FILMING_SOURCE}>Madring</ExternalSource>. Tyres:{' '}
          <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>. F3 test
          format:{' '}
          <ExternalSource href={F3_OFFICIAL_SOURCE}>
            FIA Formula 3
          </ExternalSource>
          . Test red flags:{' '}
          <ExternalSource href={RED_FLAG_SOURCE}>PlanetF1</ExternalSource>. Test
          times:{' '}
          <ExternalSource href={LAP_TIME_SOURCE}>Pit Debrief</ExternalSource>.
          Cable theft:{' '}
          <ExternalSource href={THEFT_SOURCE}>Grandprix.com</ExternalSource>.
          Construction and homologation:{' '}
          <ExternalSource href={BUILD_SOURCE}>
            RacingCircuits.info
          </ExternalSource>
          . Ambassador role:{' '}
          <ExternalSource href={SAINZ_SOURCE}>PlanetF1</ExternalSource>.
          Hamilton on the lap:{' '}
          <ExternalSource href={HAMILTON_SOURCE}>
            Motorsport Week
          </ExternalSource>
          .
        </>
      }
    >
      {/* No secondary action. The hero's second link was the heading of
          "What to watch in practice", and on this page that section is the
          driest thing in it. `SIGNALS_HEADING` still exists because the
          section itself uses it. */}
      <RaceWriteupHero
        flagCode="ES"
        eyebrow={`11–13 Sep · Madring · Round ${race.round}`}
        title="2026 Spanish Grand Prix predictions"
        summary={raceWriteupHeroSummary(
          phase,
          'The Spanish Grand Prix',
          'Formula 1 returns to Madrid for the first time since 1981. The new Madring circuit has 22 corners, long stretches lined with barriers and a banked Turn 12 that will test the cars and tyres.',
        )}
        phase={phase}
        raceSlug={RACE_SLUG}
        venueName="Madrid"
        primaryActionTargetId={isLive ? RACE_WRITEUP_PICKS_ANCHOR : undefined}
        schedule={{
          race,
          timeZone: 'Europe/Madrid',
          timeZoneLabel: 'Madrid time',
          weather,
          now: weatherNow,
        }}
      />

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
          <WeekendPracticeSection
            results={practice}
            raceSlug={RACE_SLUG}
            schedule={race}
          />
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
        <>
          <MonzaRecap />
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Madrid"
            sourceUrl={F1_STANDINGS_SOURCE}
          />
        </>
      ) : null}

      <RaceFaqSection faqs={FAQS} />

      <RaceWriteupFinish
        isLive={isLive}
        phase={phase}
        raceId={race._id}
        round={race.round}
        season={race.season}
        raceSlug={RACE_SLUG}
        venueName="Madrid"
        nextRace={nextRace}
      />
    </RaceWriteupPage>
  );
}

/** Formula 3 test findings and drivers’ first impressions. */
function FormulaThreeTest() {
  return (
    <RaceWriteupSection
      id="f3-test"
      heading="What Formula 3 testing showed"
      aside={<WriteUpNewsPhoto {...FORMULA_THREE_WRITEUP_IMAGE} />}
      extra={
        <CircuitStatStrip
          stats={[
            ['19', 'Red flags'],
            ['11', 'Into the barriers'],
            ['24–25', 'August, two days'],
            [
              '1:49.034',
              <>
                <Flag code="US" size="xs" />
                Fastest: Ugochukwu
              </>,
            ],
          ]}
        />
      }
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Formula 3 tested at the Madring on 24 and 25 August. The two days
        produced 19 red flags, including 11 crashes into the barriers.{' '}
        <ExternalSource href={RED_FLAG_SOURCE}>
          PlanetF1&rsquo;s test report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Most of the crashes happened around Turns 5 to 7 and at Turn 17. Drivers
        also hit the barriers at the exit of Turn 3 and at Turn 14.{' '}
        <ExternalSource href={RED_FLAG_SOURCE}>
          Where the test was interrupted
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Williams counted three broken chassis and six damaged suspensions in the
        test data. Team principal James Vowles said the circuit could be
        particularly hard on the cars.{' '}
        <ExternalSource href={VOWLES_SOURCE}>
          Vowles on the test damage
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Sainz was more cautious when asked about the crashes at Monza. He said
        it was too early to judge how Formula 1 cars would handle the circuit
        from the Formula 3 test alone.{' '}
        <ExternalSource href={SAINZ_LABEL_SOURCE}>
          Sainz on the Formula 3 comparison
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Speaking in Madrid on Wednesday 9 September, Sainz said simulator laps
        and Formula 3 footage suggested an intense circuit, with &ldquo;turn
        after turn, wall after wall&rdquo;. He compared it with Baku and Jeddah,
        two tracks he enjoys racing on.{' '}
        <ExternalSource href={SAINZ_WEDNESDAY_SOURCE}>
          Sainz on the Madrid lap
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        After driving the circuit in the simulator, Verstappen compared it with
        Jeddah and warned that mistakes could lead to heavy crashes. He also
        said it was difficult to put a clean lap together.{' '}
        <ExternalSource href={VERSTAPPEN_SIM_SOURCE}>
          Verstappen&rsquo;s first impressions
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

/** Construction status and surface preparation. */
function TrackReadiness() {
  return (
    <RaceWriteupSection id="track-readiness" heading="Circuit preparations">
      <p className="gpp-reading-copy mt-5 text-text-muted">
        Around 300 metres of cable was stolen on Sunday 30 August from
        generators serving a tunnel section of the circuit. Spanish police are
        investigating. The race schedule is unchanged.{' '}
        <ExternalSource href={THEFT_SOURCE}>
          Report on the cable theft
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The final layer of asphalt was laid on 31 May, and the FIA approved the
        circuit for Formula 1 on 23 June. Work since then has focused on
        grandstands, hospitality and temporary facilities.{' '}
        <ExternalSource href={BUILD_SOURCE}>
          Circuit construction timeline
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        With little running on the new surface, grip should improve as Formula
        1, Formula 2 and Formula 3 lay down rubber over the weekend. That will
        make it harder to compare lap times from different sessions.
      </p>
    </RaceWriteupSection>
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
    <RaceWriteupSection
      id="track-map"
      heading="What the lap looks like"
      extra={
        // Full width rather than beside a column of copy. The other write-up
        // runs a photograph next to its map; the only picture this page has is
        // Jarama, and it belongs with 1981.
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
      }
    >
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Sector 1 is the long run from Turn 1 to Turn 5. Sector 2 carries the
        banking at Turn 12. Sector 3 is the tight section through the exhibition
        halls.
      </p>
    </RaceWriteupSection>
  );
}

/** Banking is expressed as both a percentage gradient and an angle. */
function LaMonumental() {
  return (
    <RaceWriteupSection
      id="la-monumental"
      heading="La Monumental: Madrid&rsquo;s banked Turn 12"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        La Monumental is a 550-metre right-hander with 24% banking, equivalent
        to an angle of about 13.5 degrees. The circuit&rsquo;s chief operations
        officer compares it with Zandvoort&rsquo;s banking, stretched over a
        longer corner.{' '}
        <ExternalSource href={CORNER_SOURCE}>
          The Race&rsquo;s guide to La Monumental
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        James Vowles said the Formula 3 test showed cars staying under load
        through the banking for roughly four and a half seconds. That puts
        sustained stress on the car as well as the tyres.{' '}
        <ExternalSource href={VOWLES_SOURCE}>
          Vowles on the banking
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Teams will need enough ground clearance to keep the floor from scraping
        through the banking. Raising the ride height can help, but may reduce
        aerodynamic performance elsewhere on the lap. If the plank underneath
        the car wears beyond the permitted limit, the car can be disqualified.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Practice will show how well each team manages that compromise,
        particularly on longer runs with more fuel on board.
      </p>
    </RaceWriteupSection>
  );
}

/** Practice observations; keep untested overtaking prospects conditional. */
function WatchTable() {
  return (
    <RaceSignalsSection
      heading={SIGNALS_HEADING}
      stats={[
        ['5.416', 'km circuit'],
        ['22', 'corners'],
        ['57', 'race laps'],
        ['24%', 'banking at Turn 12 (13.5°)'],
      ]}
      signals={[
        [
          'Learning the circuit',
          'Teams need to check their simulations against real running',
          'Ferrari has driven here on demonstration tyres, but Friday is the first chance for every team to test its race setup. Consistent laps will be more useful than an early headline time.',
        ],
        [
          'The final sector',
          'Watch for lock-ups and wheelspin around the exhibition halls',
          'The closely spaced corners leave little time to recover from a mistake. Drivers need confidence on the brakes and good traction on the exits.',
        ],
        [
          'Overtaking',
          'The approaches to the Turn 5/6 chicane and Turn 12 are worth watching',
          'Both could offer passing opportunities, but we still need to see how closely the cars can follow. Hamilton described the layout as a qualifying-lap circuit with no real straights.',
        ],
      ]}
    />
  );
}

function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Tyres for Madrid"
      venue="Madrid"
      hardest="C2"
      aside={<WriteUpNewsPhoto {...PIRELLI_MEDIUM_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Pirelli expects Madrid to be one of the five most demanding circuits for
        the tyres. Cornering forces should be similar to Barcelona and
        Silverstone, while La Monumental is expected to produce the highest
        vertical load of the season.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s Madrid preview
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The smooth asphalt offers relatively little grip. It has been cleaned
        with high-pressure water jets to remove dust and oily residues. Teams
        may save sets of the Hard tyre for Sunday if practice shows the softer
        compounds wearing out quickly.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Formula 1&rsquo;s forecast, published on 9 September, expects a dry
        weekend with air temperatures reaching 30°C on Friday, 31°C on Saturday
        and 32°C on Sunday. It also flags the heat index for monitoring over the
        weekend.{' '}
        <ExternalSource href={WEATHER_SOURCE}>
          Formula 1&rsquo;s weather forecast
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}

/** The previous round’s result, with a link to its full write-up. */
function MonzaRecap() {
  return (
    <RaceWriteupSection
      id="monza-recap"
      heading="Antonelli won Monza from 19th"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Antonelli recovered from 19th on the grid to win at Monza after a power
        unit penalty. Leclerc&rsquo;s crash at Parabolica brought out a red flag
        on lap 2. Russell finished second ahead of Verstappen, Norris, Piastri
        and Hamilton. Gasly had taken pole for Alpine.{' '}
        <ExternalSource href={MONZA_RESULT_SOURCE}>
          The Monza race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Monza rewards straight-line speed. Madrid&rsquo;s 22 corners will ask
        different things of the cars, so the order could change again this
        weekend.{' '}
        <Link
          to="/f1-2026-italian-grand-prix-predictions"
          className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          Monza results and predictions
        </Link>
        .
      </p>
    </RaceWriteupSection>
  );
}

/** Madrid’s racing history, event news and home drivers. */
function SpanishDrivers({ drivers }: { drivers: readonly StandingsDriver[] }) {
  if (drivers.length === 0) {
    return null;
  }

  return (
    <RaceWriteupSection
      id="spanish-drivers"
      heading="Villeneuve won the last Grand Prix held in Madrid"
      aside={
        <>
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
        </>
      }
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Gilles Villeneuve won at Jarama in June 1981 by holding off four faster
        cars. His Ferrari&rsquo;s straight-line speed helped him defend the lead
        despite its poor handling through the corners. He finished 0.22 seconds
        ahead of Jacques Laffite, with the top five separated by just 1.24
        seconds.{' '}
        <ExternalSource href={JARAMA_SOURCE}>
          Motor Sport&rsquo;s account of the 1981 race
        </ExternalSource>
        .
      </p>
      <h3 className="font-title mt-6 text-xl font-medium text-text">
        Williams brings back its 1981 colours
      </h3>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Williams revealed a special white, green and navy livery on Tuesday 8
        September. It is based on the FW07C driven by Alan Jones and Carlos
        Reutemann at Jarama in 1981, the year Williams won the
        constructors&rsquo; championship. Sainz unveiled the car at
        Madrid&rsquo;s Plaza del Callao.{' '}
        <ExternalSource href={WILLIAMS_LIVERY_SOURCE}>
          See the Williams livery
        </ExternalSource>
        .
      </p>
      <h3 className="font-title mt-6 text-xl font-medium text-text">
        A home race for Sainz and Alonso
      </h3>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Formula 1 has not been back to Madrid in the 45 years since. Barcelona
        held the Spanish Grand Prix from 1991 until last season and now runs as
        the{' '}
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug: 'spain-2026' }}
          className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          Barcelona-Catalunya Grand Prix
        </Link>
        , so Spain has two rounds in 2026.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Organisers announced on 9 September that the debut is sold out. They
        expect a total attendance of nearly 350,000 across the three days, with
        more than 60% of the audience coming from Spain.{' '}
        <ExternalSource href={MADRID_ATTENDANCE_SOURCE}>
          Madring&rsquo;s attendance announcement
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Madrid-born Carlos Sainz has been the circuit&rsquo;s ambassador since
        April 2025 and joined the organisers for the start of construction. He
        and Fernando Alonso are the two Spanish drivers on the grid.{' '}
        <ExternalSource href={SAINZ_SOURCE}>
          Sainz&rsquo;s role at the Madring
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Sainz expects a difficult weekend for Williams. He said on Wednesday
        that the team&rsquo;s next upgrade is due at Baku and that scoring
        points in Madrid would be a challenge.{' '}
        <ExternalSource href={WILLIAMS_UPGRADE_SOURCE}>
          Sainz on Williams&rsquo; prospects
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}
