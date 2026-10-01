import { api } from '@convex-generated/api';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
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

const RACE_SLUG = 'brazil-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'Interlagos';
const PATH = '/f1-2026-sao-paulo-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/brazil';
const SPRINT_2026_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY';
/** Pirelli's 2025 São Paulo preview: circuit, bumps, rain, the 2024 race and the 2025 compounds. */
const PIRELLI_2025_SOURCE =
  'https://press.pirelli.com/harder-compounds-for-the-sao-paulo-sprint-weekend/';
/** The 2025 partial resurface and drainage grooves. */
const RESURFACE_2025_SOURCE = 'https://www.f1technical.net/news/27985';
/** Formula 1's driver profile: Audi kept Bortoleto for its first works season. */
const BORTOLETO_SOURCE =
  'https://www.formula1.com/en/drivers/gabriel-bortoleto';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/norris-wins-thrilling-sao-paulo-gp-from-antonelli-as-verstappen-climbs-to.4T0Y5xGNn1MOVegzhGTqAx';
const QUALIFYING_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/norris-grabs-pole-position-in-sao-paulo-ahead-of-antonelli-and-leclerc-as.51zXqPIrqvKIKuvCL6CAgp';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'Is the 2026 São Paulo Grand Prix a sprint weekend?',
    answer:
      'No. São Paulo ran the Sprint format in 2025, but it is not one of the six 2026 sprint weekends, so the weekend has three practice sessions before qualifying.',
  },
  {
    question: 'When is the 2026 São Paulo Grand Prix?',
    answer:
      'The weekend runs from Friday 6 to Sunday 8 November 2026 at Interlagos. Qualifying starts at 15:00 São Paulo time on Saturday and the 71-lap Grand Prix starts at 14:00 on Sunday.',
  },
  {
    question: 'Who won the 2025 São Paulo Grand Prix?',
    answer:
      'Lando Norris, from pole position, ahead of Kimi Antonelli and Max Verstappen, who started from the pit lane.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-sao-paulo-grand-prix-predictions',
)({
  component: SaoPauloGrandPrixPredictionsPage,
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
    return {
      race,
      championship,
      weather,
      weatherNow,
      news,
      season,
      practice,
    };
  },
  head: ({ loaderData }) =>
    raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: '2026 São Paulo Grand Prix Predictions & Picks | Interlagos',
      description: {
        live: 'Make your 2026 São Paulo Grand Prix predictions. Interlagos has no Sprint this year, and rain moved its 2024 qualifying to Sunday morning.',
        finished:
          '2026 São Paulo Grand Prix predictions scored against the official Interlagos classification. See who called the top 5 in Brazil.',
        cancelled: 'The 2026 São Paulo Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 São Paulo Grand Prix at Interlagos.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 São Paulo Grand Prix',
      breadcrumbName: 'São Paulo Grand Prix predictions',
      race: loaderData?.race,
      faqs: FAQS,
    }),
});

function SaoPauloGrandPrixPredictionsPage() {
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
          . Circuit, weather and 2025 tyres:{' '}
          <ExternalSource href={PIRELLI_2025_SOURCE}>Pirelli</ExternalSource>.
          2025 resurfacing:{' '}
          <ExternalSource href={RESURFACE_2025_SOURCE}>
            F1Technical
          </ExternalSource>
          . Bortoleto:{' '}
          <ExternalSource href={BORTOLETO_SOURCE}>Formula 1</ExternalSource>.
          2025 qualifying and race:{' '}
          <ExternalSource href={QUALIFYING_2025_SOURCE}>
            Formula 1
          </ExternalSource>{' '}
          and <ExternalSource href={RACE_2025_SOURCE}>Formula 1</ExternalSource>
          .
        </>
      }
    >
      <RaceWriteupHero
        flagCode="BR"
        eyebrow={`6–8 Nov · São Paulo · Round ${race.round}`}
        title="São Paulo Grand Prix 2026 predictions"
        summary={raceWriteupHeroSummary(
          phase,
          'The São Paulo Grand Prix',
          'Gabriel Bortoleto races at home with Audi, on a bumpy anticlockwise circuit where rain is a regular risk in November.',
        )}
        phase={phase}
        raceSlug={RACE_SLUG}
        venueName="São Paulo"
        signalsHeading={SIGNALS_HEADING}
        schedule={{
          race,
          timeZone: 'America/Sao_Paulo',
          timeZoneLabel: 'São Paulo time',
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
      <BortoletoHomeRace />
      <Circuit />
      <Rain />
      <LastYear />
      <RaceWriteupClosingPanel
        phase={phase}
        raceId={race._id}
        raceSlug={RACE_SLUG}
        venueName="São Paulo"
      />

      {isLive ? (
        <>
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="São Paulo"
          />
        </>
      ) : null}

      <RaceFaqSection faqs={FAQS} />
    </RaceWriteupPage>
  );
}

function BortoletoHomeRace() {
  return (
    <RaceWriteupSection
      id="bortoleto-home-race"
      heading="Bortoleto returns to Interlagos with Audi"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Gabriel Bortoleto&rsquo;s first home Grand Prix ended on the opening lap
        in 2025, when contact with Lance Stroll sent his Sauber into the
        barriers.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        . Audi took over the team and kept him for its first season as a works
        entry.{' '}
        <ExternalSource href={BORTOLETO_SOURCE}>
          Formula 1&rsquo;s driver profile
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
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
        Interlagos is <Figure>4.309 km</Figure> long with{' '}
        <Figure>15 corners</Figure>, and the Grand Prix runs anticlockwise for{' '}
        <Figure>71 laps</Figure>. Pirelli says the mix of straights and twisty
        sections gives plenty of overtaking chances and a higher risk of Safety
        Cars.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s circuit notes
        </ExternalSource>
        . The lap starts on a sort of half oval, runs through the Senna S and
        down to Turn 4, winds through an infield with camber changes and climbs
        back up the hill through the banked final corner.{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          Formula 1&rsquo;s circuit guide
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The track is built on unstable ground and stays bumpy. It was fully
        resurfaced for 2024, which left a smooth, less abrasive surface that
        still had plenty of bumps.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        . Drivers were not convinced, so for 2025 the organisers resurfaced
        again from Turn 12 to Turn 1 and from Turn 3 to Turn 4, and cut grooves
        into the asphalt to drain water.{' '}
        <ExternalSource href={RESURFACE_2025_SOURCE}>
          F1Technical on the changes
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function Rain() {
  return (
    <RaceWriteupSection
      id="rain"
      heading="Rain moved qualifying to Sunday morning in 2024"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Weather at Interlagos is very changeable at this time of year. In 2024,
        with bad weather forecast, the Race Director moved qualifying to{' '}
        <Figure>07:30</Figure> on Sunday and brought the Grand Prix forward to{' '}
        <Figure>12:30</Figure>. No dry tyres were used all day. Everyone started
        on Intermediates, and the race was red-flagged at half distance as the
        rain got heavier.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli on the 2024 race
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
      heading="Verstappen reached the podium from the pit lane in 2025"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Lando Norris took pole by <Figure>0.174 seconds</Figure> from Kimi
        Antonelli, with Charles Leclerc third. Max Verstappen went out in Q1 in
        16th.{' '}
        <ExternalSource href={QUALIFYING_2025_SOURCE}>
          The 2025 qualifying report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Red Bull then changed his car under parc fermé, so he started from the
        pit lane. Norris won by <Figure>10.388 seconds</Figure>, and Antonelli
        held off Verstappen for second by 0.362 seconds. Verstappen had stopped
        early for a puncture under a Virtual Safety Car. That VSC came after
        Oscar Piastri locked up at the restart and hit Antonelli, pushing the
        Mercedes into Leclerc&rsquo;s Ferrari, which retired. Piastri took a
        10-second penalty and finished fifth, behind George Russell.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli brought C2, C3 and C4, one step harder than in 2024, after the
        dry tyres had shown heavy wear and graining on Friday and Saturday
        morning that year.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 selection
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}
