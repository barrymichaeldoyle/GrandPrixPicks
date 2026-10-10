import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RACE_WRITEUP_PICKS_ANCHOR } from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceWriteupArticle } from '@/components/race-writeups/RaceWriteupArticle';
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
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { lastReviewedAt } from '@/lib/lastReviewed';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import { routeQuery } from '@/lib/routeQuery';

const RACE_SLUG = 'singapore-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Marina Bay Street Circuit';
const PATH = '/f1-2026-singapore-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/singapore';
const SPRINT_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const HEAT_SOURCE =
  'https://press.pirelli.com/managing-the-heat-under-the-lights-in-singapore/';
/** The official 2025 race and qualifying classifications. */
const RESULT_2025_SOURCE =
  'https://www.formula1.com/en/results/2025/races/1270/singapore/race-result';
const QUALIFYING_2025_SOURCE =
  'https://www.formula1.com/en/results/2025/races/1270/singapore/qualifying';

/*
 * Weekend facts only.
 *
 * The scoring question came off on 2026-09-08: it is the game's rule rather
 * than this weekend's fact, `/how-to-play` and `/results-policy` own it, and
 * the same answer on every write-up is the cross-page duplication
 * `docs/seo-content-policy.md` exists to stop. Madrid dropped it for the same
 * reason. What replaced it is the thing a player needs here that no other page
 * on the site says: a sprint weekend is four sets of picks, not two, and the
 * Sprint has run before the Grand Prix Qualifying set locks.
 */
const FAQS = [
  {
    question: 'Is the 2026 Singapore Grand Prix a sprint weekend?',
    answer:
      'Yes. Singapore hosts its first Formula 1 sprint weekend in 2026. Sprint Qualifying follows the only practice session on Friday, the Sprint and Grand Prix Qualifying run on Saturday, and the Grand Prix is on Sunday.',
  },
  {
    question: 'When is the 2026 Singapore Grand Prix?',
    answer:
      'The weekend runs from 9 to 11 October 2026 at Marina Bay. The Sprint starts at 17:00 Singapore time on Saturday and the 62-lap Grand Prix starts at 20:00 on Sunday.',
  },
  {
    question: 'How many practice sessions are there in Singapore?',
    answer:
      'One. Practice 1 runs on Friday before Sprint Qualifying. There is no second or third practice session on a sprint weekend.',
  },
  {
    question: 'How does a sprint weekend change your predictions?',
    answer:
      'You make four sets of picks instead of two: a Top 5 for Sprint Qualifying, the Sprint, Grand Prix Qualifying and the Grand Prix. Each set locks when its own session starts, so the Sprint has already run by the time your Grand Prix Qualifying picks close.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-singapore-grand-prix-predictions',
)({
  component: SingaporeGrandPrixPredictionsPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();
    const weatherNow = Date.now();
    const [race, championship, weather, news, season, practice, nextRace] =
      await Promise.all([
        context.queryClient.ensureQueryData(
          routeQuery(api.races.getRaceBySlug, { slug: RACE_SLUG }),
        ),
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
      nextRace,
    };
  },
  head: ({ loaderData, match }) =>
    raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: '2026 Singapore Grand Prix Predictions & Sprint Picks',
      description: {
        live: 'Make your 2026 Singapore Grand Prix and Sprint predictions. Marina Bay hosts its first sprint weekend, with one practice session.',
        finished:
          '2026 Singapore Grand Prix predictions scored against the official Marina Bay classification. See who called the top 5 across the sprint and the race.',
        cancelled: 'The 2026 Singapore Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Singapore Grand Prix at Marina Bay.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Singapore Grand Prix',
      breadcrumbName: 'Singapore Grand Prix predictions',
      race: loaderData?.race,
      news: loaderData?.news?.items,
      search: match.search,
      faqs: FAQS,
    }),
});

function SingaporeGrandPrixPredictionsPage() {
  const {
    race,
    championship,
    weather,
    weatherNow,
    news,
    season,
    practice,
    nextRace,
  } = Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);
  const canPick = isLive && (!nextRace || nextRace.slug === RACE_SLUG);
  const picks = (
    <RaceWriteupFinish
      isLive={isLive}
      phase={phase}
      raceId={race._id}
      round={race.round}
      season={race.season}
      raceSlug={RACE_SLUG}
      venueName="Singapore"
      nextRace={nextRace}
      hasSprint={race.hasSprint}
      loadImmediately
    />
  );

  return (
    <RaceWriteupPage
      hero={
        <RaceWriteupHero
          flagCode="SG"
          eyebrow={`09–11 Oct · Marina Bay · Round ${race.round}`}
          title="Singapore Grand Prix 2026 predictions"
          summary={raceWriteupHeroSummary(
            phase,
            'The Singapore Grand Prix',
            'Singapore hosts its first sprint weekend, with one practice session before Sprint Qualifying on Friday.',
          )}
          phase={phase}
          raceSlug={RACE_SLUG}
          primaryActionTargetId={
            canPick ? RACE_WRITEUP_PICKS_ANCHOR : undefined
          }
          nextRace={phase === 'finished' ? nextRace : undefined}
          venueName="Singapore"
          signalsHeading={SIGNALS_HEADING}
          schedule={{
            race,
            timeZone: 'Asia/Singapore',
            timeZoneLabel: 'Singapore time',
            weather,
            now: weatherNow,
          }}
        />
      }
      storeLinkInFooter={!(isLive && news.items.length > 0)}
      reviewedAt={PROSE_REVIEWED_AT}
      sources={
        <>
          Schedule and circuit:{' '}
          <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
          Sprint format:{' '}
          <ExternalSource href={SPRINT_SOURCE}>
            FIA and Formula 1
          </ExternalSource>
          . Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
          Heat and strategy:{' '}
          <ExternalSource href={HEAT_SOURCE}>Pirelli</ExternalSource>. 2025
          qualifying and race:{' '}
          <ExternalSource href={QUALIFYING_2025_SOURCE}>
            Formula 1
          </ExternalSource>{' '}
          and{' '}
          <ExternalSource href={RESULT_2025_SOURCE}>Formula 1</ExternalSource>.
        </>
      }
    >
      {/* The weekend's news opens the page, straight after the hero: it is
          the one thing here that changes between visits, and the section a
          returning reader is looking for. It can lead now because one column
          wide the cards fold to their headlines (`WeekendNewsSection`), so the
          block is a list of six lines rather than the three screens of full
          cards and an advert it was until October 2026. Renders nothing until
          there is an item. */}
      {isLive ? (
        <WeekendNewsSection items={news.items} storePage={RACE_SLUG} />
      ) : null}
      <RaceWriteupArticle
        actions={{
          phase,
          raceSlug: RACE_SLUG,
          venueName: 'Singapore',
          primaryActionTargetId: canPick
            ? RACE_WRITEUP_PICKS_ANCHOR
            : undefined,
        }}
      >
        <article
          aria-label="Singapore weekend preview"
          className="max-w-[68ch] [&>section]:py-8 sm:[&>section]:py-10"
        >
          <SaturdayEvidence />
          <Circuit />
          <TyreChoice />
          <LastYear />
        </article>
      </RaceWriteupArticle>
      {/* The picker directly after the prose: the article is what the page
          ranks for, and finishing it is the moment a reader is ready to pick.
          Practice and the standings follow; both render nothing until they
          have a session or a round. */}
      {picks}
      {isLive ? (
        <>
          <WeekendPracticeSection
            results={practice}
            raceSlug={RACE_SLUG}
            schedule={race}
          />
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Singapore"
          />
        </>
      ) : null}

      <RaceFaqSection faqs={FAQS} />
    </RaceWriteupPage>
  );
}

/**
 * The circuit's figures, written into the prose in bold rather than set as a
 * four-up strip above four signal rows. The start time is in the hero's
 * schedule card and is not repeated here.
 */
function Circuit() {
  return (
    <RaceWriteupSection
      id={RACE_WRITEUP_CIRCUIT_ANCHOR}
      heading={SIGNALS_HEADING}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Marina Bay is <Figure>4.927 km</Figure> long with{' '}
        <Figure>19 corners</Figure>, down from 23 before the 2023 layout change,
        and the Grand Prix runs for <Figure>62 laps</Figure>. The street surface
        is bumpy, and drivers are busy at the wheel for most of the lap.{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          Formula 1&rsquo;s circuit guide
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Singapore held the first Grand Prix run entirely at night, in 2008.
        Humidity is usually above <Figure>70%</Figure> and the temperature sits
        between <Figure>24 and 31°C</Figure>, and drivers can lose up to{' '}
        <Figure>3 kg</Figure> over the race. The 2023 layout change made
        overtaking a little easier, but Pirelli still describes passing here as
        rather complicated.{' '}
        <ExternalSource href={HEAT_SOURCE}>
          Pirelli on racing in the heat
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

/**
 * Last year's result, and why starting position matters more here than at
 * most circuits. Pirelli's figures are from its 2025 preview, so "before
 * 2025" is the reading of its "to date".
 */
function LastYear() {
  return (
    <RaceWriteupSection id="last-year" heading="Russell won from pole in 2025">
      <p className="gpp-reading-copy mt-4 text-text-muted">
        George Russell took pole and led the race to win by 5.4 seconds from Max
        Verstappen, with Lando Norris third and Oscar Piastri fourth. Kimi
        Antonelli was fifth.{' '}
        <ExternalSource href={RESULT_2025_SOURCE}>
          The 2025 race result
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pole counts for more at Marina Bay than at most circuits. Of the 15
        Singapore Grands Prix before 2025, ten were won from pole. Verstappen
        had never won here going into that race, and second place kept it that
        way. The 2024 race was one of the few at this track to run without a
        Safety Car, and the pit lane speed limit went up from 60 to 80 km/h in
        2025, which Pirelli expected to make a one-stop race almost obligatory.{' '}
        <ExternalSource href={HEAT_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Singapore gets the softest three tyres"
      venue="Singapore"
      hardest="C3"
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Baku gets the same three.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s selection
        </ExternalSource>
        . In 2025 Pirelli left out its softest compound, the C6, because of the
        forces and heat here, and it names thermal stress as the main cause of
        tyre degradation in Singapore.{' '}
        <ExternalSource href={HEAT_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}

/**
 * What the Sprint tells you before qualifying, and what it does not.
 *
 * A paragraph telling the reader to "use the Sprint to update the back of
 * your Grand Prix Top 5" came off on 2026-09-08 because it instructed rather
 * than reported. The "pick order" card beside this section and the five-up
 * session grid that opened the page came off on 2026-09-21: both restated the
 * hero's schedule card.
 */
function SaturdayEvidence() {
  return (
    <RaceWriteupSection
      id="saturday-evidence"
      heading="What the Sprint tells us"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        The Sprint is the only race-pace evidence before Grand Prix Qualifying.
        It starts four hours earlier on Saturday, and its result does not set
        the Grand Prix grid.{' '}
        <Link
          to="/how-to-play"
          className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          How sprint weekends are scored
        </Link>
        .
      </p>
    </RaceWriteupSection>
  );
}
