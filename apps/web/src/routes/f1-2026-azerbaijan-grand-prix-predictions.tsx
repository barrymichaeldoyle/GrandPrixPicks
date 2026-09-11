import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { BakuCrashMap } from '@/components/race-writeups/BakuCrashMap';
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
import { bakuCrashDatasetSchema } from '@/lib/bakuDataset';
import { raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';
import { routeQuery } from '@/lib/routeQuery';

const RACE_SLUG = 'azerbaijan-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'What matters in Baku';
const PATH = '/f1-2026-azerbaijan-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/azerbaijan';
const SATURDAY_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-confirms-2026-pre-season-testing-dates-and-issues-calendar-update.5VKfdqe7JcdsCJcEnQE0xw';
const TYRE_SOURCE =
  'https://press.pirelli.com/tyre-compound-selections-for-baku-sepang-and-singapore/';
const FORM_SOURCE =
  'https://www.formula1.com/en/latest/article/strategy-guide-what-are-the-tactical-options-for-the-azerbaijan-grand-prix.7tfp6ZvfiLy6dJ0D598abf.7tfp6ZvfiLy6dJ0D598abf';
const QUALIFYING_2025_SOURCE =
  'https://www.autosport.com/f1/news/six-shunts-azerbaijans-2025-f1-qualifying-broke-a-red-flag-record/10761064/';
const RACE_SOURCE =
  'https://www.formula1.com/en/latest/article/what-the-teams-said-race-day-in-azerbaijan-2025.6AWm00FUiNNbYWhkFqRjLH';

const FAQS = [
  {
    question: 'Why is the 2026 Azerbaijan Grand Prix on a Saturday?',
    answer:
      'Formula 1 and the FIA moved the race from Sunday 27 September to Saturday 26 September at the promoter’s request, to accommodate a national day. Every session moved one day earlier, so practice starts on Thursday and qualifying is on Friday.',
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
      title: '2026 Azerbaijan Grand Prix Predictions & Picks | Baku',
      description: {
        live: 'Make your 2026 Azerbaijan Grand Prix predictions. Baku races on Saturday this year, with practice starting Thursday. Pick a top 5 for every session.',
        finished:
          '2026 Azerbaijan Grand Prix predictions scored against the official Baku classification. See who called the top 5 on a street circuit that punishes a mistake.',
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
    }),
});

function AzerbaijanGrandPrixPredictionsPage() {
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
          'Baku races on Saturday this year. The long straight rewards efficiency; the old-city walls punish every mistake.',
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

      <SaturdayRace />
      <WatchTable />
      <TyreChoice />
      <BakuCrashMap />
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

function SaturdayRace() {
  return (
    <RaceWriteupSection
      id="saturday-race"
      heading="The Grand Prix is on Saturday"
      aside={
        <RaceWriteupFactList
          facts={[
            ['Thursday', 'Practice 1 and Practice 2'],
            ['Friday', 'Practice 3 and Qualifying'],
            ['Saturday', 'Grand Prix'],
            ['Race start', '15:00 Baku time'],
          ]}
        />
      }
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        The Azerbaijan Grand Prix was originally due on Sunday 27 September.
        Formula 1 and the FIA moved it to Saturday 26 September at the
        promoter&rsquo;s request, to accommodate a national day.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The entire programme moved with it. Practice starts on Thursday,
        qualifying is Friday, and race picks lock on Saturday. The sessions are
        in their usual order; only the days changed.{' '}
        <ExternalSource href={SATURDAY_SOURCE}>
          Formula 1 announcement
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function WatchTable() {
  return (
    <RaceSignalsSection
      heading={SIGNALS_HEADING}
      stats={[
        ['6.003', 'km circuit'],
        ['51', 'race laps'],
        ['20', 'turns'],
        ['15:00', 'local start'],
      ]}
      signals={[
        [
          'Straight-line efficiency',
          'Speed from Turn 16 to Turn 1',
          'The flat-out run is long enough to expose drag. A car that reaches the straight slowly keeps paying for it for almost two kilometres.',
        ],
        [
          'Old-city confidence',
          'Commitment through Turns 8 to 12',
          'The road narrows beside the castle walls. A driver who leaves margin loses time that cannot be recovered in that sector.',
        ],
        [
          'Braking stability',
          'Lock-ups at Turns 1 and 3',
          'Both stops follow high speed and offer passing chances. A weak front end costs lap time and invites an overtake.',
        ],
        [
          'Wind direction',
          'Changes in braking points and tow strength',
          'The exposed straights make the lap sensitive to gusts. A braking reference that worked on one lap can move on the next.',
        ],
      ]}
    >
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Baku asks for low drag on its enormous straight and grip through the
        slow old-city section. Every setup gives something away.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Qualifying is where that bites. The 2025 session was stopped six times,
        a Formula 1 record, and six different drivers put it into the walls.{' '}
        <ExternalSource href={QUALIFYING_2025_SOURCE}>
          Autosport on the record
        </ExternalSource>
        .
      </p>
    </RaceSignalsSection>
  );
}

function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Baku gets the softest three tyres"
      venue="Baku"
      hardest="C3"
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Pirelli selected C3, C4 and C5. Baku generally produces low degradation,
        and the one-stop has often been the quickest route even when a softer
        range is available.
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The strategic question is timing. A Safety Car can make a stop cheap,
        but waiting for one that never arrives leaves a driver on old tyres. The
        2025 race stayed a straightforward one-stop after its early Safety Car.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s selection
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
  );
}
