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

const RACE_SLUG = 'mexico-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Autódromo Hermanos Rodríguez';
const PATH = '/f1-2026-mexico-city-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/mexico';
const SPRINT_2026_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY';
/** Pirelli's 2025 Mexico City preview: altitude, surface, graining and the 2025 compounds. */
const PIRELLI_2025_SOURCE =
  'https://press.pirelli.com/once-again-a-skip-in-compounds-for-the-mexico-city-weekend/';
/** Cadillac's announcement of the Reforma show run and Pérez's 300th start. */
const CADILLAC_PEREZ_SOURCE =
  'https://www.cadillacf1team.com/news/sergio-perez-returns-to-mexico-and-celebrates-300-formula-1-grands-prix-with-show-run-on-paseo-de-la-reforma';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/norris-seals-commanding-win-in-action-packed-mexico-city-gp-to-take-world.5ztiajHhdtqagu0qQLx0vS';
const QUALIFYING_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/norris-charges-to-pole-position-in-mexico-ahead-of-leclerc-and-hamilton.7HZL7OOKMbgNw5Rogc7iCC';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'Is the 2026 Mexico City Grand Prix a sprint weekend?',
    answer:
      'No. Mexico City is not one of the six 2026 sprint weekends, so the weekend has three practice sessions before qualifying.',
  },
  {
    question: 'When is the 2026 Mexico City Grand Prix?',
    answer:
      'The weekend runs from Friday 30 October to Sunday 1 November 2026 at the Autódromo Hermanos Rodríguez. Qualifying starts at 15:00 Mexico City time on Saturday and the 71-lap Grand Prix starts at 14:00 on Sunday.',
  },
  {
    question: 'Who won the 2025 Mexico City Grand Prix?',
    answer:
      'Lando Norris, from pole position, ahead of Charles Leclerc and Max Verstappen.',
  },
] as const;

export const Route = createFileRoute(
  '/f1-2026-mexico-city-grand-prix-predictions',
)({
  component: MexicoCityGrandPrixPredictionsPage,
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
      title: '2026 Mexico City Grand Prix Predictions & Picks | Mexican GP',
      description: {
        live: 'Make your 2026 Mexico City Grand Prix predictions. Sergio Pérez races at home with Cadillac, at a circuit more than 2,200 metres above sea level.',
        finished:
          '2026 Mexico City Grand Prix predictions scored against the official classification. See who called the top 5 at the Autódromo Hermanos Rodríguez.',
        cancelled: 'The 2026 Mexico City Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Mexico City Grand Prix at the Autódromo Hermanos Rodríguez.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Mexico City Grand Prix',
      breadcrumbName: 'Mexico City Grand Prix predictions',
      race: loaderData?.race,
      faqs: FAQS,
    }),
});

function MexicoCityGrandPrixPredictionsPage() {
  const { race, championship, weather, weatherNow, news, season, practice } =
    Route.useLoaderData();
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);

  return (
    <RaceWriteupPage
      storeLinkInFooter={!(isLive && news.items.length > 0)}
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
          Pérez:{' '}
          <ExternalSource href={CADILLAC_PEREZ_SOURCE}>Cadillac</ExternalSource>
          . 2025 qualifying and race:{' '}
          <ExternalSource href={QUALIFYING_2025_SOURCE}>
            Formula 1
          </ExternalSource>{' '}
          and <ExternalSource href={RACE_2025_SOURCE}>Formula 1</ExternalSource>
          .
        </>
      }
    >
      <RaceWriteupHero
        flagCode="MX"
        eyebrow={`30 Oct–1 Nov · Mexico City · Round ${race.round}`}
        title="Mexico City Grand Prix 2026 predictions"
        summary={raceWriteupHeroSummary(
          phase,
          'The Mexico City Grand Prix',
          'Sergio Pérez is back for his home race, now with Cadillac, at a circuit more than 2,200 metres above sea level.',
        )}
        phase={phase}
        raceSlug={RACE_SLUG}
        venueName="Mexico City"
        signalsHeading={SIGNALS_HEADING}
        schedule={{
          race,
          timeZone: 'America/Mexico_City',
          timeZoneLabel: 'Mexico City time',
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
      <PerezHomeRace />
      <Circuit />
      <LastYear />
      <RaceWriteupClosingPanel
        phase={phase}
        raceId={race._id}
        raceSlug={RACE_SLUG}
        venueName="Mexico City"
      />

      {isLive ? (
        <>
          <RaceWriteupChampionshipContext
            championship={championship}
            races={season.races}
            thisRound={race.round}
            venueName="Mexico City"
          />
        </>
      ) : null}

      <RaceFaqSection faqs={FAQS} />
    </RaceWriteupPage>
  );
}

function PerezHomeRace() {
  return (
    <RaceWriteupSection
      id="perez-home-race"
      heading="Pérez is back for his home race"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Sergio Pérez was not on the grid in Mexico City in 2025. He returns with
        Cadillac, the 11th team, which is racing here for the first time in its
        debut season. Cadillac says this is the week Pérez reaches{' '}
        <Figure>300 Grand Prix starts</Figure>, and he opens it with a show run
        down Paseo de la Reforma on Wednesday 28 October.{' '}
        <ExternalSource href={CADILLAC_PEREZ_SOURCE}>
          Cadillac&rsquo;s announcement
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
        The lap is <Figure>4.304 km</Figure> with <Figure>17 corners</Figure>,
        and the Grand Prix runs for <Figure>71 laps</Figure>. The circuit sits
        more than <Figure>2,200 metres</Figure> above sea level, and in the thin
        air the cars make less downforce. That helps top speed on a main
        straight over <Figure>1.2 km</Figure> long, and Pirelli says drivers
        change gear less here than at any other track.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s circuit notes
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The surface is smooth and sees little use during the year, so it has
        little grip on Friday and lap times fall as rubber goes down. Tyre
        temperatures drop along the two long straights, which makes lock-ups
        under braking more likely. With little downforce the tyres slide, and
        Pirelli says graining here has historically been pronounced.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The last sector cuts across the old Peraltada corner and winds through a
        former baseball stadium, where the podium ceremony takes place.{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          Formula 1&rsquo;s circuit guide
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function LastYear() {
  return (
    <RaceWriteupSection id="last-year" heading="Norris won from pole in 2025">
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Lando Norris took pole by <Figure>0.262 seconds</Figure> from the
        Ferraris of Charles Leclerc and Lewis Hamilton.{' '}
        <ExternalSource href={QUALIFYING_2025_SOURCE}>
          The 2025 qualifying report
        </ExternalSource>
        . He won the race by <Figure>30.324 seconds</Figure>. Leclerc held
        second by 0.725 seconds from Max Verstappen, who had started fifth, and
        Oliver Bearman finished fourth for Haas, his best result, ahead of Oscar
        Piastri. The win put Norris one point ahead of Piastri in the
        championship.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Four cars went for the lead into Turn 1, and several cut the corner.
        Teams expected one stop, and more than half the field started on the
        Soft.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        . Pirelli brought C2, C4 and C5, skipping a step between the Hard and
        the Medium as it had in Austin the week before.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 selection
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}
