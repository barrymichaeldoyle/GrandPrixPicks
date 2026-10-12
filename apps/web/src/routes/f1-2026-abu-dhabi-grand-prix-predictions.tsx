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

const RACE_SLUG = 'abu-dhabi-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Yas Marina Circuit';
const PATH = '/f1-2026-abu-dhabi-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE =
  'https://www.formula1.com/en/racing/2026/united-arab-emirates';
/** Pirelli's 2025 preview: the track, the compounds, the 2024 race and the records. */
const PIRELLI_2025_SOURCE =
  'https://press.pirelli.com/in-abu-dhabi-for-a-first-step-towards-the-f1-of-the-future/';
/** Pirelli's 2024 preview: daylight practice, night qualifying and the undercut. */
const PIRELLI_2024_SOURCE =
  'https://press.pirelli.com/to-abu-dhabi-for-the-grand-finale/';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/norris-secures-maiden-f1-title-in-abu-dhabi-with-podium-finish-behind.EMJtmvRA0uzmzUC4MZgmw';
const RESULT_2025_SOURCE =
  'https://www.formula1.com/en/results/2025/races/1276/abu-dhabi/race-result';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'When is the 2026 Abu Dhabi Grand Prix?',
    answer:
      'The race starts at 17:00 Gulf time on Sunday 6 December 2026. Practice begins on Friday 4 December, and qualifying starts at 18:00 on Saturday 5 December.',
  },
  {
    question: 'Who won the 2025 Abu Dhabi Grand Prix?',
    answer:
      'Max Verstappen, from pole. Oscar Piastri was second and Lando Norris third, which was enough for Norris to win the 2025 title by two points.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-abu-dhabi-grand-prix-predictions',
)({
  component: AbuDhabiGrandPrixPredictionsPage,
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
  head: ({ loaderData, match }) =>
    raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: '2026 Abu Dhabi Grand Prix Predictions & Picks | Yas Marina',
      description: {
        live: 'Make your 2026 Abu Dhabi Grand Prix predictions. The season closes at Yas Marina from daylight into night, a year after Norris took the title by two points.',
        finished:
          '2026 Abu Dhabi Grand Prix predictions scored against the official classification. See who called the top 5 at Yas Marina in the last race of the season.',
        cancelled: 'The 2026 Abu Dhabi Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Abu Dhabi Grand Prix at the Yas Marina Circuit.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Abu Dhabi Grand Prix',
      breadcrumbName: 'Abu Dhabi Grand Prix predictions',
      race: loaderData?.race,
      news: loaderData?.news?.items,
      search: match.search,
      faqs: FAQS,
    }),
});

function AbuDhabiGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season, practice } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <RaceWriteupPage
      hero={
        <RaceWriteupHero
          flagCode="AE"
          eyebrow={`4–6 Dec · Abu Dhabi · Round ${race.round}`}
          title="Abu Dhabi Grand Prix 2026 predictions"
          summary={raceWriteupHeroSummary(
            phase,
            'The Abu Dhabi Grand Prix',
            'The last race of the season, run from daylight into night at Yas Marina on the softest tyres Pirelli makes, where one stop is usually enough.',
          )}
          phase={phase}
          raceSlug={RACE_SLUG}
          venueName="Abu Dhabi"
          signalsHeading={SIGNALS_HEADING}
          schedule={{
            race,
            timeZone: 'Asia/Dubai',
            timeZoneLabel: 'Gulf time',
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
          Track, tyres and records:{' '}
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
        actions={{ phase, raceSlug: RACE_SLUG, venueName: 'Abu Dhabi' }}
      >
        <Circuit />
        <Tyres />
        <LastYear />
      </RaceWriteupArticle>
      <RaceWriteupClosingPanel
        phase={phase}
        raceId={race._id}
        raceSlug={RACE_SLUG}
        venueName="Abu Dhabi"
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
        <RaceWriteupChampionshipContext
          championship={championship}
          races={season.races}
          thisRound={race.round}
          venueName="Abu Dhabi"
        />
      ) : null}

      <RaceFaqSection faqs={FAQS} />
    </RaceWriteupPage>
  );
}

/**
 * The circuit's figures, written into the prose in bold. The start time is in
 * the hero's schedule card and is not repeated here. The race page's circuit
 * guide already covers the dusk start and the 2021 layout changes, so this
 * section carries the numbers, the surface and which sessions run in the
 * dark.
 */
function Circuit() {
  return (
    <RaceWriteupSection
      id={RACE_WRITEUP_CIRCUIT_ANCHOR}
      heading={SIGNALS_HEADING}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        The lap is <Figure>5.281 km</Figure> with <Figure>16 corners</Figure>,
        and the Grand Prix runs for <Figure>58 laps</Figure>. The{' '}
        <Figure>1.2 km</Figure> straight between the slow Turns 5 and 6 is where
        most of the overtaking happens, and the run through Turns 10, 11 and 12
        asks the drivers to brake hard with the car still loaded up sideways.
        The surface is made with aggregate shipped from England and gives medium
        grip and medium abrasion; Turns 1 to 4 were resurfaced in 2025 to take
        out some bumps.{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          Formula 1&rsquo;s circuit page
        </ExternalSource>{' '}
        and{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s circuit notes
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Two of the three practice sessions run in daylight, qualifying runs in
        the dark, and the race starts at sunset, so the track temperature falls
        through the sessions that matter and the grip changes with it. Support
        races including Formula 2 share the track, so it rubbers in quickly over
        the weekend. It is the circuit the drivers know best, because the
        post-season test has been held here for years.{' '}
        <ExternalSource href={PIRELLI_2024_SOURCE}>
          Pirelli&rsquo;s 2024 preview
        </ExternalSource>{' '}
        and{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function Tyres() {
  return (
    <RaceWriteupSection
      id="tyres"
      heading="The softest tyres, and usually one stop"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Pirelli brings its three softest compounds, C3, C4 and C5, as it has for
        years, because there are no high-speed corners and the loads on the
        tyres are low to medium. Yas Marina used to grain the tyres, but since
        2024 that has been limited enough that Pirelli thought even the soft,
        normally a qualifying tyre, could be part of a race plan. Degradation
        here is thermal and shows on the rears, from the traction demands of the
        final sector.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        In 2024, 19 of the 20 drivers started on the medium and the one-stop
        onto the hard was the quickest way through; only Fernando Alonso in the
        top ten stopped twice. The undercut is strong here, which is what makes
        a one-stop need careful tyre management to hold off a rival who stops
        first.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli on the 2024 race
        </ExternalSource>{' '}
        and{' '}
        <ExternalSource href={PIRELLI_2024_SOURCE}>
          Pirelli on the undercut
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
      heading="Norris took the 2025 title from third place"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Max Verstappen took pole and led from the start. On the first lap Oscar
        Piastri went around the outside of his team-mate Lando Norris at Turn 9,
        on the harder tyre, and dropped Norris to third. Norris then had Charles
        Leclerc within a second behind him, traffic to clear after an early
        first stop, and a defence from Yuki Tsunoda that cost Tsunoda a
        five-second penalty. Verstappen pitted once, from medium to hard, and
        won by twelve seconds. Piastri ran a long first stint on the hard, led
        after Verstappen stopped, and finished second. Norris held third, which
        was enough for the title by two points.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The official top five was Verstappen, Piastri, Norris, Leclerc and
        George Russell. The win was Verstappen&rsquo;s fifth here, level with
        Lewis Hamilton, who also has five poles at Yas Marina.{' '}
        <ExternalSource href={RESULT_2025_SOURCE}>
          The official classification
        </ExternalSource>{' '}
        and{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s statistics
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}
