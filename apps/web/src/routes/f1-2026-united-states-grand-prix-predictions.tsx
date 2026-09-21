import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceSignalsSection } from '@/components/race-writeups/RaceSignalsSection';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupClosingPanel } from '@/components/race-writeups/RaceWriteupClosingPanel';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import {
  RaceWriteupFactList,
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

const RACE_SLUG = 'usa-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'What matters at COTA';
const PATH = '/f1-2026-united-states-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/united-states';
const SPRINT_2026_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY';
/** Pirelli's 2025 Austin preview: circuit, 2024 heat and resurfacing, and the 2025 compounds. */
const PIRELLI_2025_SOURCE =
  'https://press.pirelli.com/a-texas-rodeo-with-a-jump-in-compounds/';
const SPRINT_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/verstappen-wins-dramatic-austin-sprint-as-both-mclarens-retire-in-lap-1.2cOAGwv5tyMmpmiGlzZiUW';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/verstappen-surges-to-commanding-victory-in-us-gp-ahead-of-norris-and-leclerc.2JcVVmPiQJsn7Js9LpOJJ';
const FERRARI_UPGRADE_SOURCE =
  'https://www.the-race.com/formula-1/ferrari-f1-2026-development-latest-stalled-whats-going-on/';
const MERCEDES_ENGINE_SOURCE =
  'https://www.the-race.com/formula-1/george-russell-mercedes-f1-engine-penalty-delay/';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'Is the 2026 United States Grand Prix a sprint weekend?',
    answer:
      'No. Austin ran the Sprint format in 2025, but it is not one of the six 2026 sprint weekends, so the weekend has three practice sessions before qualifying.',
  },
  {
    question: 'When is the 2026 United States Grand Prix?',
    answer:
      'The weekend runs from Friday 23 to Sunday 25 October 2026 at the Circuit of the Americas. Qualifying starts at 16:00 Austin time on Saturday and the 56-lap Grand Prix starts at 15:00 on Sunday.',
  },
  {
    question: 'Who won the 2025 United States Grand Prix?',
    answer:
      'Max Verstappen, from pole position, ahead of Lando Norris and Charles Leclerc. He also won the Sprint that weekend.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-united-states-grand-prix-predictions',
)({
  component: UnitedStatesGrandPrixPredictionsPage,
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
      title: '2026 United States Grand Prix Predictions & Picks | Austin',
      description: {
        live: 'Make your 2026 United States Grand Prix predictions. Austin is a standard weekend this year, with three practice sessions before qualifying.',
        finished:
          '2026 United States Grand Prix predictions scored against the official Austin classification. See who called the top 5 at the Circuit of the Americas.',
        cancelled: 'The 2026 United States Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 United States Grand Prix at the Circuit of the Americas.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 United States Grand Prix',
      breadcrumbName: 'United States Grand Prix predictions',
      race: loaderData?.race,
      faqs: FAQS,
    }),
});

function UnitedStatesGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season, practice } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <RaceWriteupPage
      reviewedAt={PROSE_REVIEWED_AT}
      sources={
        <>
          Schedule and circuit:{' '}
          <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
          2026 sprint weekends:{' '}
          <ExternalSource href={SPRINT_2026_SOURCE}>
            FIA and Formula 1
          </ExternalSource>
          . Circuit and 2025 tyres:{' '}
          <ExternalSource href={PIRELLI_2025_SOURCE}>Pirelli</ExternalSource>.
          2025 Sprint and race:{' '}
          <ExternalSource href={SPRINT_2025_SOURCE}>Formula 1</ExternalSource>{' '}
          and <ExternalSource href={RACE_2025_SOURCE}>Formula 1</ExternalSource>
          . Upgrades:{' '}
          <ExternalSource href={FERRARI_UPGRADE_SOURCE}>
            The Race
          </ExternalSource>{' '}
          and{' '}
          <ExternalSource href={MERCEDES_ENGINE_SOURCE}>
            The Race
          </ExternalSource>
          .
        </>
      }
    >
      <RaceWriteupHero
        flagCode="US"
        eyebrow={`23–25 Oct · Austin · Round ${race.round}`}
        title="United States Grand Prix 2026 predictions"
        summary={raceWriteupHeroSummary(
          phase,
          'The United States Grand Prix',
          'Austin opens three races in the Americas, and this year it is a standard weekend: three practice sessions before qualifying, and no Sprint.',
        )}
        phase={phase}
        raceSlug={RACE_SLUG}
        venueName="Austin"
        signalsHeading={SIGNALS_HEADING}
        schedule={{
          race,
          timeZone: 'America/Chicago',
          timeZoneLabel: 'Austin time',
          weather,
          now: weatherNow,
        }}
      />

      <StandardWeekend />
      <WatchTable />
      <Upgrades />
      <LastYear />
      {isLive ? (
        <>
          <WeekendNewsSection items={news.items} />
          <WeekendPracticeSection
            results={practice}
            raceSlug={RACE_SLUG}
            schedule={race}
          />
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Austin"
          />
        </>
      ) : null}

      <RaceFaqSection faqs={FAQS} />

      <RaceWriteupClosingPanel
        phase={phase}
        raceId={race._id}
        raceSlug={RACE_SLUG}
        venueName="Austin"
      />
    </RaceWriteupPage>
  );
}

function StandardWeekend() {
  return (
    <RaceWriteupSection
      id="standard-weekend"
      heading="Three practice sessions this time"
      aside={
        <RaceWriteupFactList
          facts={[
            ['Friday', 'Practice 1 and Practice 2'],
            ['Saturday', 'Practice 3 and Qualifying'],
            ['Sunday', 'Grand Prix'],
            ['Race start', '15:00 Austin time'],
          ]}
        />
      }
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Austin ran the Sprint format in 2025, which left teams one hour of
        practice before competitive running began. It is not one of the six
        sprint weekends in 2026, so the weekend has its full three practice
        sessions before qualifying on Saturday afternoon.{' '}
        <ExternalSource href={SPRINT_2026_SOURCE}>
          The 2026 sprint calendar
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        It is the first of three races on consecutive weekends, with Mexico City
        on 1 November and São Paulo on 8 November.
      </p>
    </RaceWriteupSection>
  );
}

function WatchTable() {
  return (
    <RaceSignalsSection
      heading={SIGNALS_HEADING}
      stats={[
        ['5.513', 'km circuit'],
        ['56', 'race laps'],
        ['20', 'turns'],
        ['15:00', 'local start'],
      ]}
      signals={[
        [
          'Turn 1',
          'The climb after the start line',
          'The circuit has 41 metres of elevation change, and the steepest of it is the run up to Turn 1. It is a braking zone and a passing chance on every lap, and the busiest place on the circuit on the first.',
        ],
        [
          'High-speed direction changes',
          'Balance through Turns 3 to 6',
          'The run is modelled on Maggotts and Becketts. A car that moves around there loses time and heats its tyres.',
        ],
        [
          'Thermal degradation',
          'Lap times late in a long run',
          'Pirelli describes the tyre wear here as mostly thermal. The temperature passed 30°C during the 2024 race.',
        ],
        [
          'Track evolution',
          'How far times fall between sessions',
          'Rubber builds up across the weekend. In 2024 that let drivers stretch their stints further than the Sprint had suggested.',
        ],
      ]}
    >
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli describes a lap that needs top-end speed as well as stability
        through its more technical sections. The circuit was partially
        resurfaced in 2024, which Pirelli says made it smoother and less bumpy
        than before.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s circuit notes
        </ExternalSource>
        .
      </p>
    </RaceSignalsSection>
  );
}

/**
 * The parts reported for Austin. Both come from the same publication, so both
 * are worded as reporting: neither team has announced a date.
 */
function Upgrades() {
  return (
    <RaceWriteupSection
      id="upgrades"
      heading="Ferrari and Mercedes are both bringing new parts"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Ferrari has scheduled its main aerodynamic update for Austin, partly for
        logistical reasons and partly because the layout suits judging whether
        it works. The team has fallen back from the front since its Barcelona
        win.{' '}
        <ExternalSource href={FERRARI_UPGRADE_SOURCE}>
          The Race on Ferrari&rsquo;s plans
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Mercedes&rsquo; upgraded power unit was first expected for Baku, Sepang
        and Singapore, and is now reported to be more likely to arrive for this
        triple-header. George Russell has used up several of his engine
        components for the season and plans to take his grid penalty when the
        new specification arrives, so the race where it appears is likely to be
        the one where he starts further back.{' '}
        <ExternalSource href={MERCEDES_ENGINE_SOURCE}>
          The Race on Russell&rsquo;s penalty
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
      heading="Verstappen won from pole in 2025"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Max Verstappen won the Sprint and then led the Grand Prix from pole,
        finishing 7.959 seconds ahead of Lando Norris. Norris passed Charles
        Leclerc for second in the closing laps, and Lewis Hamilton was fourth.
        Every driver made one pit stop.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli brought C1, C3 and C4 that year, skipping a step between the
        Hard and the Medium to open up the choice between one stop and two.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 selection
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}
