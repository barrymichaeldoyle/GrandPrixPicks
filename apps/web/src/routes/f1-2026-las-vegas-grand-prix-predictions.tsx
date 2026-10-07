import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupArticle } from '@/components/race-writeups/RaceWriteupArticle';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import {
  RACE_WRITEUP_CIRCUIT_ANCHOR,
  RaceWriteupFigure as Figure,
  RaceWriteupSection,
} from '@/components/race-writeups/RaceWriteupSection';
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

const RACE_SLUG = 'las-vegas-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Las Vegas Strip Circuit';
const PATH = '/f1-2026-las-vegas-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/las-vegas';
/** Pirelli's 2025 preview: the circuit, grip, Turn 14 and the compounds. */
const PIRELLI_2025_SOURCE = 'https://press.pirelli.com/roulette-in-las-vegas/';
/** Pirelli's 2024 preview: the desert temperature drop, warm-up and strategy. */
const PIRELLI_2024_SOURCE =
  'https://press.pirelli.com/formula-1s-fourth-visit-to-las-vegas/';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/verstappen-beats-norris-for-dominant-las-vegas-gp-victory-as-piastri.6u1Op0SO7YQa2bwJOq8DVI';
const RESULT_2025_SOURCE =
  'https://www.formula1.com/en/results/2025/races/1274/las-vegas/race-result';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'When is the 2026 Las Vegas Grand Prix?',
    answer:
      'The race starts at 20:00 Las Vegas time on Saturday 21 November 2026. Practice begins on Thursday 19 November, and qualifying starts at 20:00 on Friday 20 November.',
  },
  {
    question: 'Who won the 2025 Las Vegas Grand Prix?',
    answer:
      'Max Verstappen. George Russell and Kimi Antonelli completed the podium after both McLarens were disqualified.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-las-vegas-grand-prix-predictions',
)({
  component: LasVegasGrandPrixPredictionsPage,
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
  head: ({ loaderData }) =>
    raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: '2026 Las Vegas Grand Prix Predictions & Picks | The Strip',
      description: {
        live: 'Make your 2026 Las Vegas Grand Prix predictions. A Saturday-night race on a cold desert street circuit, a year after both McLarens were disqualified.',
        finished:
          '2026 Las Vegas Grand Prix predictions scored against the official classification. See who called the top 5 on the Strip.',
        cancelled: 'The 2026 Las Vegas Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Las Vegas Grand Prix on the Las Vegas Strip Circuit.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Las Vegas Grand Prix',
      breadcrumbName: 'Las Vegas Grand Prix predictions',
      race: loaderData?.race,
      faqs: FAQS,
    }),
});

function LasVegasGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season, practice } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <RaceWriteupPage
      hero={
        <RaceWriteupHero
          flagCode="US"
          eyebrow={`19–21 Nov · Las Vegas · Round ${race.round}`}
          title="Las Vegas Grand Prix 2026 predictions"
          summary={raceWriteupHeroSummary(
            phase,
            'The Las Vegas Grand Prix',
            'A Saturday-night race down the Strip, where getting the tyres warm is the main problem, a year after both McLarens were disqualified.',
          )}
          phase={phase}
          raceSlug={RACE_SLUG}
          venueName="Las Vegas"
          signalsHeading={SIGNALS_HEADING}
          schedule={{
            race,
            timeZone: 'America/Los_Angeles',
            timeZoneLabel: 'Las Vegas time',
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
          Circuit, grip and tyres:{' '}
          <ExternalSource href={PIRELLI_2025_SOURCE}>Pirelli</ExternalSource>{' '}
          and{' '}
          <ExternalSource href={PIRELLI_2024_SOURCE}>Pirelli</ExternalSource>.
          2025 race and classification:{' '}
          <ExternalSource href={RACE_2025_SOURCE}>Formula 1</ExternalSource> and{' '}
          <ExternalSource href={RESULT_2025_SOURCE}>Formula 1</ExternalSource>.
        </>
      }
    >
      {/* The weekend's news opens the page: see the Singapore route and
          `docs/race-writeup-lifecycle.md`. Renders nothing until there is an
          item. */}
      {isLive ? (
        <WeekendNewsSection items={news.items} storePage={RACE_SLUG} />
      ) : null}
      <RaceWriteupArticle
        actions={{ phase, raceSlug: RACE_SLUG, venueName: 'Las Vegas' }}
      >
        <Circuit />
        <ColdTyres />
        <LastYear />
      </RaceWriteupArticle>
      <RaceWriteupClosingPanel
        phase={phase}
        raceId={race._id}
        raceSlug={RACE_SLUG}
        venueName="Las Vegas"
      />
      {/* Practice follows the article and the call to pick. It renders
          nothing until there is a session. */}
      {isLive ? (
        <WeekendPracticeSection
          results={practice}
          raceSlug={RACE_SLUG}
          schedule={race}
        />
      ) : null}

      {isLive ? (
        <>
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Las Vegas"
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
        The lap is <Figure>6.201 km</Figure> with <Figure>17 corners</Figure>,
        the second longest on the calendar after Spa, and the Grand Prix runs
        for <Figure>50 laps</Figure>. Almost <Figure>80%</Figure> of the lap is
        spent at full throttle. In 2024 Alex Albon reached{' '}
        <Figure>368 km/h</Figure> between Turns 12 and 14, the highest top speed
        of that season, and the heavy braking into Turn 14 is one of the best
        places to overtake.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s circuit notes
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The track uses public roads, past the Venetian and Caesars Palace.
        Street furniture and oil left by everyday traffic cut the grip, so lap
        times improve a lot over the weekend.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function ColdTyres() {
  return (
    <RaceWriteupSection
      id="cold-tyres"
      heading="Getting the tyres warm is the hard part"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Several races run at night, but none has as big a drop in temperature
        from day to night, because Las Vegas sits in the Mojave desert. The
        November date makes it colder still. Pirelli expected air temperatures
        of around <Figure>10°C</Figure> in 2024, with the track not much warmer.
        Cold tyres are hardest to bring up to temperature in qualifying, and at
        the front in particular. They cool further along the long straights,
        which makes lock-ups more likely at the braking points at the end of
        them.{' '}
        <ExternalSource href={PIRELLI_2024_SOURCE}>
          Pirelli&rsquo;s 2024 preview
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli brought C3, C4 and C5 for a third year running in 2025. It did
        not go softer because graining has been a problem at every edition of
        this race. The sessions started two hours earlier than in 2024, which
        Pirelli expected to make conditions a little less cold.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 selection
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function LastYear() {
  return (
    <RaceWriteupSection
      id="last-year"
      heading="Both McLarens were disqualified in 2025"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Lando Norris took pole in a wet qualifying session. At the start he ran
        wide at Turn 1, and Max Verstappen took the lead and won. Norris
        finished second on the road, nearly 21 seconds behind after nursing a
        late problem. After the race both McLarens were disqualified, because
        the rearmost skid wear on Norris&rsquo;s and Oscar Piastri&rsquo;s cars
        was below the minimum thickness.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The official top five was Verstappen, George Russell, Kimi Antonelli,
        Charles Leclerc and Carlos Sainz. Antonelli had started 17th and taken a
        five-second penalty for a false start.{' '}
        <ExternalSource href={RESULT_2025_SOURCE}>
          The official classification
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}
