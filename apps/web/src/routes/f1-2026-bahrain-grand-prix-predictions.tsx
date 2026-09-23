import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';

import { RACE_WRITEUP_PICKS_ANCHOR } from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceNameLink } from '@/components/race-writeups/RaceNameLink';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupFinish } from '@/components/race-writeups/RaceWriteupFinish';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import {
  RACE_WRITEUP_CIRCUIT_ANCHOR,
  RaceWriteupFigure as Figure,
  RaceWriteupSection,
} from '@/components/race-writeups/RaceWriteupSection';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { SessionConsensusSections } from '@/components/SessionConsensus';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { lastReviewedAt } from '@/lib/lastReviewed';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { routeQuery } from '@/lib/routeQuery';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';

/** The date the hand-written prose on this page was last checked. */
const PROSE_REVIEWED = getRaceWriteupReviewedAt('bahrain-2026');

const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const PATH = '/f1-2026-bahrain-grand-prix-predictions';
const RACE_SLUG = 'bahrain-2026';

/**
 * The circuit section's heading. Declared once so the section cannot drift
 * from the name the rest of the page uses for it.
 */
const SIGNALS_HEADING = 'The Sepang International Circuit';
const F1_CIRCUIT_SOURCE = 'https://www.formula1.com/en/racing/2026/bahrain';
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
  'https://studiodromo.it/portfolio/sepang-international-circuit/';
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
          routeQuery(api.weather.getForWriteup, {
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
    head: ({ loaderData }) =>
      raceWriteupPageHead({
        path: PATH,
        raceSlug: RACE_SLUG,
        title: '2026 Bahrain Grand Prix Predictions | Sepang',
        description: {
          live: '2026 Bahrain Grand Prix predictions at Sepang in Malaysia. Pick a top 5 for qualifying and the race at a circuit the 2026 cars have never run.',
          finished:
            '2026 Bahrain Grand Prix predictions scored against the official Sepang classification. See who called the top 5 for qualifying and the race.',
          cancelled: 'The 2026 Bahrain Grand Prix was called off.',
        },
        imageAlt:
          'Grand Prix Picks race card for the 2026 Bahrain Grand Prix at Sepang in Malaysia.',
        reviewedAt: PROSE_REVIEWED_AT,
        eventName: '2026 Bahrain Grand Prix',
        eventAlternateName: '2026 Sepang Grand Prix',
        breadcrumbName: 'Bahrain Grand Prix predictions',
        race: loaderData?.race,
        faqs: FAQS,
      }),
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
    <RaceWriteupPage
      reviewedAt={PROSE_REVIEWED_AT}
      sources={
        <>
          Calendar change:{' '}
          <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource> and{' '}
          <ExternalSource href={RELOCATION_SOURCE}>Sky Sports</ExternalSource>.
          Funding and tickets:{' '}
          <ExternalSource href={COMMERCIAL_SOURCE}>Bernama</ExternalSource>.
          Start time:{' '}
          <ExternalSource href={START_TIME_SOURCE}>News.GP</ExternalSource>.
          Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
          Tyre data:{' '}
          <ExternalSource href={PIRELLI_DATA_SOURCE}>Autosport</ExternalSource>.
          Track surface:{' '}
          <ExternalSource href={SURFACE_SOURCE}>Dromo</ExternalSource>.
        </>
      }
    >
      {/* Bahrain's flag on a race run in Malaysia is not a bug. The race
          keeps its identity and the circuit is a separate fact, which is
          exactly the split `circuits.ts` exists to hold. The eyebrow names
          Sepang so the two are never read as one. */}
      <RaceWriteupHero
        flagCode="BH"
        eyebrow={`02–04 Oct · Sepang · Round ${race.round}`}
        title="2026 Bahrain Grand Prix predictions"
        summary={raceWriteupHeroSummary(
          phase,
          'The Bahrain Grand Prix',
          'Formula 1 last raced at Sepang in 2017. The 2026 cars have never run here, and this year\u2019s Bahrain Grand Prix is being held in Malaysia.',
        )}
        phase={phase}
        raceSlug={RACE_SLUG}
        venueName="Sepang"
        primaryActionTargetId={isLive ? RACE_WRITEUP_PICKS_ANCHOR : undefined}
        schedule={{
          race,
          timeZone: 'Asia/Kuala_Lumpur',
          timeZoneLabel: 'Sepang time',
          weather,
          now: weatherNow,
        }}
      />

      {/* This weekend's news and practice lead the page while it is live:
          they are what changes between visits. Both render nothing until they
          have an item or a session. */}
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
      <SessionConsensusSections sessions={consensusSessions} />
      <WhyMalaysia />
      <NoCurrentForm />
      <Circuit />
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

      <RaceWriteupFinish
        isLive={isLive}
        phase={phase}
        raceId={race._id}
        round={race.round}
        season={race.season}
        raceSlug={RACE_SLUG}
        venueName="Sepang"
        nextRace={nextRace}
      />
    </RaceWriteupPage>
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
    <RaceWriteupSection
      id="why-malaysia"
      heading="A Bahrain Grand Prix in Malaysia"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        The Bahrain Grand Prix was the fourth round of the season, due at Sakhir
        from 10 to 12 April. It was called off on safety grounds following the
        outbreak of conflict in the region, as was the Saudi Arabian Grand Prix
        the week after.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Formula 1, the FIA and the governments of Bahrain and Malaysia then
        agreed to reinstate the race at Sepang in October. It keeps the Bahrain
        Grand Prix name, and Bahrain keeps the ticket pricing rights and the
        ticket revenue because it is paying the hosting fee.{' '}
        <ExternalSource href={COMMERCIAL_SOURCE}>
          Bernama on how the race is funded
        </ExternalSource>
        .{' '}
        <ExternalSource href={RELOCATION_SOURCE}>
          Sky Sports on the calendar change
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
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
    <RaceWriteupSection
      id="no-current-form"
      heading="The last Formula 1 race here was in 2017"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Sepang held the Malaysian Grand Prix from 1999 to 2017. Nine years of
        regulation changes sit between that race and this one, and the 2026 cars
        are new this season, so no driver on the grid has a lap here in anything
        resembling the car they will drive.
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
        The asphalt has changed since those 2017 laps were set. Dromo resurfaced
        the circuit in 2016 and relaid Turns 7 to 12 in 2023, so the middle
        sector is seven years newer than the rest of the lap.{' '}
        <ExternalSource href={SURFACE_SOURCE}>
          Dromo on the work it did
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

/**
 * The circuit's figures, written into the prose in bold rather than set as a
 * four-up strip above four signal rows. The start time is in the hero's
 * schedule card, and the resurfacing is in the section above.
 */
function Circuit() {
  return (
    <RaceWriteupSection
      id={RACE_WRITEUP_CIRCUIT_ANCHOR}
      heading={SIGNALS_HEADING}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Sepang is <Figure>5.543 km</Figure> long with{' '}
        <Figure>15 corners</Figure>, and the Grand Prix runs for{' '}
        <Figure>56 laps</Figure>. The track is wide, with long straights, heavy
        braking zones and fast, flowing corners, so drivers can attack from
        different lines. Its best-known corners are the long sweep through Turns
        5 and 6 and the final hairpin at Turn 15, which leads onto the main
        straight.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The heat and humidity are high, and a tropical downpour can change
        conditions quickly. Vettel&rsquo;s <Figure>1:34.080</Figure> from 2017
        is still the lap record.{' '}
        <ExternalSource href={F1_CIRCUIT_SOURCE}>
          Formula 1&rsquo;s circuit guide
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
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
        Pirelli brings C2, C3 and C4, one step harder than the C3, C4 and C5
        going to Baku and Singapore either side of this weekend. It left out the
        hardest compounds to narrow the gap between a one-stop and a two-stop
        race, so teams have more strategies to choose from.{' '}
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
    <RaceWriteupSection
      id="triple-header"
      heading="The middle race of a triple-header"
      extra={
        neighbours.length > 0 ? (
          <ol className="mt-7 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-3">
            {neighbours.map((race) => (
              <li key={race.slug} className="bg-surface p-4 sm:p-5">
                <p className="gpp-mono text-xs text-text-muted">
                  Round {race.round}
                </p>
                <p className="font-title mt-2 font-medium text-text">
                  <RaceNameLink race={race} />
                </p>
              </li>
            ))}
          </ol>
        ) : null
      }
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Sepang was slotted between Azerbaijan and Singapore, so the teams race
        three weekends in a row and travel from Baku to Malaysia to Singapore.
        Singapore is a sprint weekend.
      </p>
    </RaceWriteupSection>
  );
}
