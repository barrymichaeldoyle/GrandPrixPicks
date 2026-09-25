import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { BakuCrashMap } from '@/components/race-writeups/BakuCrashMap';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import {
  RACE_WRITEUP_CIRCUIT_ANCHOR,
  RaceWriteupFigure as Figure,
  RaceWriteupSection,
} from '@/components/race-writeups/RaceWriteupSection';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WriteUpNewsPhoto } from '@/components/WriteUpNewsPhoto';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import { lastReviewedAt } from '@/lib/lastReviewed';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import {
  ANTONELLI_WIN_WRITEUP_IMAGE,
  BAKU_FERRARI_WRITEUP_IMAGE,
  BAKU_START_WRITEUP_IMAGE,
} from '@/lib/azerbaijan2026WriteUpImages';
import { bakuCrashDatasetSchema } from '@/lib/bakuDataset';
import { raceWeekendSnippet, raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import { routeQuery } from '@/lib/routeQuery';

const RACE_SLUG = 'azerbaijan-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Baku City Circuit';
const PATH = '/f1-2026-azerbaijan-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/azerbaijan';
const SATURDAY_SOURCE =
  'https://www.formula1.com/en/latest/article/its-race-week-5-storylines-we%27re-excited-about-ahead-of-the-2026-azerbaijan-grand-prix.6l5UWWsSVJdtKOpR8KDSzZ';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const FORM_SOURCE =
  'https://www.formula1.com/en/latest/article/strategy-guide-what-are-the-tactical-options-for-the-azerbaijan-grand-prix.7tfp6ZvfiLy6dJ0D598abf.7tfp6ZvfiLy6dJ0D598abf';
const QUALIFYING_2025_SOURCE =
  'https://www.autosport.com/f1/news/six-shunts-azerbaijans-2025-f1-qualifying-broke-a-red-flag-record/10761064/';
const RACE_SOURCE =
  'https://www.formula1.com/en/latest/article/what-the-teams-said-race-day-in-azerbaijan-2025.6AWm00FUiNNbYWhkFqRjLH';
/**
 * The official result, for the winning margin. Formula 1's own race report
 * says 4.2s; the classification says Verstappen was 4.351s behind, and a
 * number on this page follows the classification.
 */
const MADRID_CLASSIFICATION_SOURCE =
  'https://www.formula1.com/en/results/2026/races/1294/spain/race-result';
const MADRID_RESULT_SOURCE =
  'https://www.formula1.com/en/latest/article/antonelli-clinches-victory-over-verstappen-and-norris-in-spanish-gp.644ZZfPzRPEaUh2JBHcB9';

/**
 * The race-weekend snippet (see `raceWeekendSnippet`), a trial on this page
 * before it goes into the shared builder: Monza's preview title took 483
 * race-weekend impressions and no clicks.
 */
const RACE_WEEKEND_TITLE =
  'Azerbaijan GP 2026: Provisional Grid, Start Time & Picks';
const RACE_WEEKEND_DESCRIPTION =
  'The provisional starting grid for the 2026 Azerbaijan Grand Prix in Baku, with Russell on pole and the race starting at 15:00 on Saturday.';
const QUALIFYING_TITLE =
  'Russell on Pole at Baku | 2026 Azerbaijan GP Start Time';
const QUALIFYING_DESCRIPTION =
  'Russell took Baku pole in 1:42.526, ahead of Leclerc and Piastri. The 2026 Azerbaijan Grand Prix starts at 15:00 Baku time on Saturday.';

const FAQS = [
  {
    question: 'Why is the 2026 Azerbaijan Grand Prix on a Saturday?',
    answer:
      'Formula 1 and the FIA moved the race from Sunday 27 September to Saturday 26 September to avoid Azerbaijan’s Remembrance Day. Every session moved one day earlier, so practice starts on Thursday and qualifying is on Friday.',
  },
  {
    question: 'When is the 2026 Azerbaijan Grand Prix?',
    answer:
      'The weekend runs from Thursday 24 to Saturday 26 September 2026 in Baku. Qualifying starts at 16:00 Baku time on Friday and the 51-lap Grand Prix starts at 15:00 on Saturday.',
  },
  {
    question: 'Is Baku a street circuit?',
    answer:
      'Yes. The 6.003-kilometre Baku City Circuit uses public roads, including the narrow section through the old city and the long flat-out run to Turn 1.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-azerbaijan-grand-prix-predictions',
)({
  component: AzerbaijanGrandPrixPredictionsPage,
  loader: async ({ context }) => {
    await setRaceDataCacheHeaders();
    const weatherNow = Date.now();
    const [race, championship, weather, news, season, practice] =
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
      ]);
    if (!race) {
      throw notFound();
    }
    return { race, championship, weather, weatherNow, news, season, practice };
  },
  head: ({ loaderData }) => {
    const qualifyingPublished = loaderData?.news?.items.some(
      (item) => item.key === 'baku-2026-qualifying',
    );
    const snippet =
      loaderData?.race && loaderData.news
        ? raceWeekendSnippet({
            race: loaderData.race,
            now: loaderData.weatherNow,
            gridPublished: loaderData.news.items.some(
              (item) => (item.startingGrid?.length ?? 0) > 0,
            ),
          })
        : false;
    const qualifyingSnippet =
      !snippet &&
      qualifyingPublished &&
      loaderData?.race &&
      getRaceWriteupPhase(loaderData.race, loaderData.weatherNow) ===
        'race-picks';
    return raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: snippet
        ? RACE_WEEKEND_TITLE
        : qualifyingSnippet
          ? QUALIFYING_TITLE
          : '2026 Azerbaijan Grand Prix Predictions & Picks | Baku',
      description: {
        live: snippet
          ? RACE_WEEKEND_DESCRIPTION
          : qualifyingSnippet
            ? QUALIFYING_DESCRIPTION
            : 'Make your 2026 Azerbaijan Grand Prix predictions. Baku races on Saturday this year, with practice starting Thursday. Pick a top 5 for every session.',
        finished:
          '2026 Azerbaijan Grand Prix predictions, scored against the official Baku classification. See your Top 5 and team-mate picks alongside the results.',
        cancelled: 'The 2026 Azerbaijan Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Azerbaijan Grand Prix at Baku City Circuit.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Azerbaijan Grand Prix',
      breadcrumbName: 'Azerbaijan Grand Prix predictions',
      race: loaderData?.race,
      faqs: FAQS,
      extraGraph: [bakuCrashDatasetSchema(PATH)],
    });
  },
});

function AzerbaijanGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season, practice } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);
  const qualifyingPublished = news.items.some(
    (item) => item.key === 'baku-2026-qualifying',
  );

  return (
    <RaceWriteupPage
      reviewedAt={PROSE_REVIEWED_AT}
      sources={
        <>
          Schedule and circuit:{' '}
          <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
          Saturday change:{' '}
          <ExternalSource href={SATURDAY_SOURCE}>Formula 1</ExternalSource>.
          Tyres: <ExternalSource href={TYRE_SOURCE}>Pirelli</ExternalSource>.
          2025 form:{' '}
          <ExternalSource href={FORM_SOURCE}>Formula 1</ExternalSource> and{' '}
          <ExternalSource href={RACE_SOURCE}>Formula 1</ExternalSource>. 2025
          qualifying:{' '}
          <ExternalSource href={QUALIFYING_2025_SOURCE}>
            Autosport
          </ExternalSource>
          .
        </>
      }
    >
      <RaceWriteupHero
        flagCode="AZ"
        eyebrow={`24–26 Sep · Baku · Round ${race.round}`}
        title="Azerbaijan Grand Prix 2026 predictions"
        summary={raceWriteupHeroSummary(
          phase,
          'The Azerbaijan Grand Prix',
          phase === 'race-picks' && qualifyingPublished
            ? 'Russell took pole ahead of Leclerc and Piastri. The race starts at 15:00 Baku time on Saturday.'
            : 'The Grand Prix moved to Saturday this year, so practice starts on Thursday and qualifying is on Friday.',
        )}
        phase={phase}
        raceSlug={RACE_SLUG}
        venueName="Baku"
        signalsHeading={SIGNALS_HEADING}
        schedule={{
          race,
          timeZone: 'Asia/Baku',
          timeZoneLabel: 'Baku time',
          weather,
          now: weatherNow,
        }}
      />

      {/* This weekend's news and practice lead the page while it is live: they
          are what changes between visits. Both render nothing until they have
          an item or a session. */}
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
      <Circuit />
      <BakuCrashMap />
      <TyreChoice />
      {isLive ? (
        <>
          <MadridRecap />
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Baku"
          />
        </>
      ) : null}

      <RaceFaqSection faqs={FAQS} />

      <RaceWriteupClosingPanel
        phase={phase}
        raceId={race._id}
        raceSlug={RACE_SLUG}
        venueName="Baku"
      />
    </RaceWriteupPage>
  );
}

/**
 * The circuit's figures, written into the prose in bold rather than set as a
 * four-up strip: a reader got the numbers without what they mean. The start
 * time is in the hero's schedule card and is not repeated here.
 */
function Circuit() {
  return (
    <RaceWriteupSection
      id={RACE_WRITEUP_CIRCUIT_ANCHOR}
      heading={SIGNALS_HEADING}
      aside={<WriteUpNewsPhoto {...BAKU_START_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Baku is a street circuit of <Figure>6.003 km</Figure> and{' '}
        <Figure>20 corners</Figure>, and the Grand Prix runs for{' '}
        <Figure>51 laps</Figure>. The cars are flat out for{' '}
        <Figure>2.2 km</Figure> between Turn 16 and Turn 1, along the shoreline
        and down the start/finish straight, and then brake from around{' '}
        <Figure>350 km/h</Figure> for the 90-degree Turn 1, where most of the
        overtaking happens.{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          Formula 1&rsquo;s circuit guide
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Away from the straight, the lap winds through the old town. Turns 8 to
        10 run past the medieval city walls on the narrowest part of the track.
        Teams have to choose between downforce for the slow corners and low drag
        for the straight.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Qualifying in 2025 was stopped <Figure>six times</Figure>, a Formula 1
        record, and six different drivers crashed.{' '}
        <ExternalSource href={QUALIFYING_2025_SOURCE}>
          Autosport on the record
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Baku gets the softest three tyres"
      venue="Baku"
      hardest="C3"
      aside={<WriteUpNewsPhoto {...BAKU_FERRARI_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Degradation was low in 2025, and Verstappen won with a single stop from
        hard to medium after an early Safety Car.{' '}
        <ExternalSource href={RACE_SOURCE}>
          What the teams said after the 2025 race
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}

/** The previous round’s result, with a link to its full write-up. */
function MadridRecap() {
  return (
    <RaceWriteupSection
      id="madrid-recap"
      heading="Antonelli won Madrid after Norris’s slow stop"
      aside={<WriteUpNewsPhoto {...ANTONELLI_WIN_WRITEUP_IMAGE} />}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        {/* Two sentences, deliberately. This was the Madrid write-up's race
            report retold at length, and the same account on two pages is the
            cross-page duplication `docs/seo-content-policy.md` exists to stop.
            What Baku needs is the result and why; the link carries the rest. */}
        Norris led the Madring&rsquo;s first Grand Prix from pole until he
        pitted after a Virtual Safety Car, and a slow tyre change dropped him to
        fifth.{' '}
        <ExternalSource href={MADRID_RESULT_SOURCE}>
          The Madrid race report
        </ExternalSource>
        . Antonelli won by 4.351 seconds from Verstappen, and Norris recovered
        to third.{' '}
        <ExternalSource href={MADRID_CLASSIFICATION_SOURCE}>
          The official race result
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        <Link
          to="/f1-2026-madrid-grand-prix-predictions"
          className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          Madrid results and predictions
        </Link>
      </p>
    </RaceWriteupSection>
  );
}
