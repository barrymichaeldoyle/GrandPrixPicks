import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { RACE_WRITEUP_PICKS_ANCHOR } from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupFinish } from '@/components/race-writeups/RaceWriteupFinish';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import { RaceWriteupOfficialResult } from '@/components/race-writeups/RaceWriteupOfficialResult';
import {
  RACE_WRITEUP_CIRCUIT_ANCHOR,
  RaceWriteupFigure as Figure,
  RaceWriteupSection,
} from '@/components/race-writeups/RaceWriteupSection';
import { SepangLapMap } from '@/components/race-writeups/SepangLapMap';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { SessionConsensusSections } from '@/components/SessionConsensus';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { WriteUpNewsPhoto } from '@/components/WriteUpNewsPhoto';
import {
  SEPANG_OVERTAKE_WRITEUP_IMAGE,
  SEPANG_PODIUM_WRITEUP_IMAGE,
  SEPANG_VETTEL_WRITEUP_IMAGE,
} from '@/lib/bahrain2026WriteUpImages';
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
// Keep the archive sourced from the same corrected records as the news feed.
const ARCHIVE_NEWS_KEYS = new Set([
  'sepang-race-start-delayed',
  'russell-sepang-race-retirement',
  'ferrari-sepang-race-recovery',
]);

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
    question: 'Why was the 2026 Bahrain Grand Prix held in Malaysia?',
    answer:
      'The round was due to run at Sakhir in April and was called off on safety grounds, along with the Saudi Arabian Grand Prix. Formula 1, the FIA and the governments of Bahrain and Malaysia agreed to reinstate it at Sepang in October. It keeps the Bahrain Grand Prix name, and Bahrain sets the ticket prices and receives the ticket revenue.',
  },
  {
    question: 'When was the 2026 Bahrain Grand Prix?',
    answer:
      'The weekend took place from 2 to 4 October 2026 at Sepang. Qualifying was on Saturday and the Grand Prix was scheduled to start at 15:00 Malaysian time on Sunday.',
  },
  {
    question: 'When did Formula 1 last race at Sepang?',
    answer:
      'Formula 1 returned to Sepang on 4 October 2026 for the Bahrain Grand Prix. Before that, its last visit was the 2017 Malaysian Grand Prix. Dromo resurfaced Sepang in 2016 and relaid Turns 7 to 12 in 2023.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-bahrain-grand-prix-predictions')(
  {
    component: BahrainGrandPrixPredictionsPage,
    loader: async ({ context }) => {
      await setRaceDataCacheHeaders();
      const weatherNow = Date.now();
      const race = await context.queryClient.ensureQueryData(
        routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
      );
      if (!race) {
        throw notFound();
      }
      const isLive = isRaceWriteupLive(getRaceWriteupPhase(race, weatherNow));
      const [
        championship,
        weather,
        news,
        season,
        practice,
        consensus,
        top5,
        nextRace,
      ] = await Promise.all([
        // Live. This page is published well ahead of the weekend, so three
        // rounds are still to be scored before it and a hand-typed table would
        // be wrong long before anybody reads it in October.
        context.queryClient.ensureQueryData(
          routeQuery(api.f1Standings.getF1Championship, {}),
        ),
        isLive
          ? context.queryClient.ensureQueryData(
              routeQuery(api.weather.getForWriteup, {
                raceSlug: RACE_SLUG,
                now: weatherNow,
              }),
            )
          : null,
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
          routeQuery(api.results.getEnrichedTop5BySessionForRaceSlug, {
            raceSlug: RACE_SLUG,
          }),
        ),
        context.queryClient.ensureQueryData(
          routeQuery(api.races.getNextRace, {}),
        ),
      ]);
      return {
        race,
        championship,
        weather,
        weatherNow,
        news,
        season,
        practice,
        consensus,
        top5,
        nextRace,
      };
    },
    head: ({ loaderData }) =>
      raceWriteupPageHead({
        path: PATH,
        raceSlug: RACE_SLUG,
        title:
          loaderData?.race.status === 'finished'
            ? '2026 Bahrain Grand Prix Results & Picks | Sepang'
            : '2026 Bahrain Grand Prix Predictions | Sepang',
        description: {
          live: '2026 Bahrain Grand Prix predictions at Sepang in Malaysia. Follow weekend news, tyres and circuit analysis, then pick a top 5 for qualifying and the race.',
          finished:
            '2026 Bahrain Grand Prix results at Sepang, the key race developments and how players picked the Top 5. Make your picks for the next Formula 1 race.',
          cancelled: 'The 2026 Bahrain Grand Prix was called off.',
        },
        imageAlt:
          'Grand Prix Picks race card for the 2026 Bahrain Grand Prix at Sepang in Malaysia.',
        reviewedAt: PROSE_REVIEWED_AT,
        eventName: '2026 Bahrain Grand Prix',
        eventAlternateName: '2026 Sepang Grand Prix',
        breadcrumbName:
          loaderData?.race.status === 'finished'
            ? 'Bahrain Grand Prix results'
            : 'Bahrain Grand Prix predictions',
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
    top5,
    nextRace,
  } = Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);
  const archiveSessions = (['quali', 'race'] as const).map((session) => ({
    session,
    classification: top5[session] ?? [],
  }));
  const consensusSessions = archiveSessions.flatMap(
    ({ session, classification }) => {
      const sessionConsensus = consensus[session];
      return sessionConsensus
        ? [{ session, classification, consensus: sessionConsensus }]
        : [];
    },
  );
  const podium = top5.race?.slice(0, 3) ?? [];
  const finishedSummary =
    podium.length === 3
      ? `${podium[0]!.displayName} won ahead of ${podium[1]!.displayName} and ${podium[2]!.displayName}. Compare the official Top 5 with how players picked.`
      : 'The Bahrain Grand Prix at Sepang is complete. Compare the official Top 5 with how players picked.';
  const archiveNews = news.items.filter((item) =>
    ARCHIVE_NEWS_KEYS.has(item.key),
  );

  return (
    <RaceWriteupPage
      hero={
        // Bahrain's flag on a race run in Malaysia is not a bug. The race
        // keeps its identity and the circuit is a separate fact, which is
        // exactly the split `circuits.ts` exists to hold. The eyebrow names
        // Sepang so the two are never read as one.
        <RaceWriteupHero
          flagCode="BH"
          eyebrow={`02–04 Oct · Sepang · Round ${race.round}`}
          title={
            phase === 'finished'
              ? '2026 Bahrain Grand Prix results at Sepang'
              : '2026 Bahrain Grand Prix predictions'
          }
          summary={raceWriteupHeroSummary(
            phase,
            'The Bahrain Grand Prix',
            'Formula 1 last raced at Sepang in 2017. The 2026 cars have never run here, and this year\u2019s Bahrain Grand Prix is being held in Malaysia.',
            finishedSummary,
          )}
          phase={phase}
          raceSlug={RACE_SLUG}
          nextRace={phase === 'finished' ? nextRace : undefined}
          venueName="Sepang"
          signalsHeading={SIGNALS_HEADING}
          primaryActionTargetId={isLive ? RACE_WRITEUP_PICKS_ANCHOR : undefined}
          schedule={{
            race,
            timeZone: 'Asia/Kuala_Lumpur',
            timeZoneLabel: 'Sepang time',
            weather,
            now: weatherNow,
          }}
        />
      }
      storeLinkInFooter={!(isLive && news.items.length > 0)}
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
      {/* This weekend's news and practice lead the page while it is live:
          they are what changes between visits. Both render nothing until they
          have an item or a session. */}
      {isLive ? (
        <>
          <WeekendNewsSection items={news.items} storePage={RACE_SLUG} />
          <WeekendPracticeSection
            results={practice}
            raceSlug={RACE_SLUG}
            schedule={race}
          />
        </>
      ) : null}
      {phase === 'finished' ? (
        <>
          <RaceWriteupOfficialResult
            sessions={archiveSessions}
            venueName="Sepang"
          />
          <WeekendNewsSection
            items={archiveNews}
            heading="What decided the race"
            showStoreCard={false}
          />
          <SessionConsensusSections sessions={consensusSessions} />
        </>
      ) : null}
      <WhyMalaysia />
      <NoCurrentForm isFinished={phase === 'finished'} />
      <Circuit />
      <TyreChoice isFinished={phase === 'finished'} />
      {/* The picks follow the article and come before the reference material.
          Most readers stop around two thirds of the way down, so a picker at
          the foot of the page was one almost nobody reached. */}
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
function NoCurrentForm({ isFinished }: { isFinished: boolean }) {
  return (
    <RaceWriteupSection
      id="no-current-form"
      heading={
        isFinished
          ? 'Formula 1 returned after nine years'
          : 'The last Formula 1 race here was in 2017'
      }
      aside={<WriteUpNewsPhoto {...SEPANG_PODIUM_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        {isFinished
          ? 'Sepang held the Malaysian Grand Prix from 1999 to 2017. Formula 1 returned in 2026 after nine years of regulation changes, leaving teams without recent circuit data for the new cars.'
          : 'Sepang held the Malaysian Grand Prix from 1999 to 2017. Nine years of regulation changes sit between that race and this one, and the 2026 cars are new this season, so no driver on the grid has a lap here in anything resembling the car they will drive.'}
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli {isFinished ? 'worked' : 'is working'} from 2017 data for the
        same reason. Its motorsport director {isFinished ? 'said' : 'has said'}{' '}
        the 2017 tyre sizes are reasonably close to the current ones, which is
        the closest thing to a reference anyone has.{' '}
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
 * Only the corners the prose names. Sepang's are known by number, so the names
 * are the prose's own descriptions.
 */
const CORNERS = [
  ['5–6', 'The long sweep'],
  ['15', 'The final hairpin'],
] as const;

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
      aside={<WriteUpNewsPhoto {...SEPANG_VETTEL_WRITEUP_IMAGE} />}
      extra={
        <div className="mt-7 max-w-3xl">
          <SepangLapMap corners={CORNERS} />
        </div>
      }
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Sepang is <Figure>5.543 km</Figure> long with{' '}
        <Figure>15 corners</Figure>. A full-distance Grand Prix is{' '}
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
function TyreChoice({ isFinished }: { isFinished: boolean }) {
  return (
    <TyreCompoundSection
      heading={
        isFinished
          ? 'Sepang used the middle three tyre compounds'
          : 'Sepang gets the middle three tyres'
      }
      venue="Sepang"
      hardest="C2"
      aside={<WriteUpNewsPhoto {...SEPANG_OVERTAKE_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Pirelli {isFinished ? 'brought' : 'brings'} C2, C3 and C4, one step
        harder than the C3, C4 and C5 nominated for Baku and Singapore either
        side of this weekend. It left out the hardest compounds to narrow the
        gap between a one-stop and a two-stop race, giving teams more strategies
        to choose from.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s compound selection
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}
