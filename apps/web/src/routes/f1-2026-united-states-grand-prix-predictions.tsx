import { createFileRoute } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { StandardRaceWriteup } from '@/components/race-writeups/StandardRaceWriteup';
import {
  RACE_WRITEUP_CIRCUIT_ANCHOR,
  RaceWriteupFigure as Figure,
  RaceWriteupSection,
} from '@/components/race-writeups/RaceWriteupSection';
import { TyreCompoundSection } from '@/components/race-writeups/TyreCompoundSection';
import { lastReviewedAt } from '@/lib/lastReviewed';
import { loadRaceWriteup } from '@/lib/raceWriteupLoader';
import { raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';

const RACE_SLUG = 'usa-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Circuit of the Americas';
const PATH = '/f1-2026-united-states-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/united-states';
const SPRINT_2026_SOURCE =
  'https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY';
/** Pirelli's 2025 Austin preview: circuit, 2024 heat and resurfacing, and the 2025 compounds. */
const PIRELLI_2025_SOURCE =
  'https://press.pirelli.com/a-texas-rodeo-with-a-jump-in-compounds/';
const TYRE_SOURCE =
  'https://press.pirelli.com/the-compound-selection-for-austin-mexico-city-and-so-paulo/';
const SPRINT_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/verstappen-wins-dramatic-austin-sprint-as-both-mclarens-retire-in-lap-1.2cOAGwv5tyMmpmiGlzZiUW';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/verstappen-surges-to-commanding-victory-in-us-gp-ahead-of-norris-and-leclerc.2JcVVmPiQJsn7Js9LpOJJ';
const FERRARI_UPGRADE_SOURCE =
  'https://www.the-race.com/formula-1/ferrari-f1-2026-development-latest-stalled-whats-going-on/';
const MERCEDES_ENGINE_SOURCE =
  'https://www.formula1.com/en/latest/article/the-story-of-the-season-russell-assesses-very-difficult-recovery-drive-in-singapore-grand-prix.bdIuyUxGaD3yWI4SpS7zZ';
const MCLAREN_UPGRADE_SOURCE =
  'https://www.motorsport.com/f1/news/mclaren-to-phase-upgrades-for-2026-fight-and-next-years-f1-development/10864787/';
/** Formula 1's Tech Weekly on the package Ferrari brought to Austin. */
const FERRARI_UPGRADE_RAN_SOURCE =
  'https://www.formula1.com/en/latest/article/what-went-into-ferraris-latest-upgrade-package-in-the-united-states.3I72X1Dos3Nty2sNxMfDD4';
const OFFICIAL_RESULT_SOURCE =
  'https://www.formula1.com/en/results/2026/races/1297/united-states/race-result';
const RACE_REPORT_SOURCE =
  'https://www.formula1.com/en/latest/article/antonelli-surges-to-dominant-victory-in-united-states-grand-prix-ahead-of-leclerc-and-verstappen.6kmBQv9FNTW7LzkDj8S34j';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'Who won the 2026 United States Grand Prix?',
    answer:
      'Kimi Antonelli, from pole position, 13.078 seconds ahead of Charles Leclerc. Max Verstappen finished third.',
  },
  {
    question: 'Was the 2026 United States Grand Prix a sprint weekend?',
    answer:
      'No. Austin ran the Sprint format in 2025, but it was not one of the six 2026 sprint weekends, so the weekend had three practice sessions before qualifying.',
  },
  {
    question: 'When was the 2026 United States Grand Prix?',
    answer:
      'The weekend ran from Friday 23 to Sunday 25 October 2026 at the Circuit of the Americas. Qualifying started at 16:00 Austin time on Saturday and the 56-lap Grand Prix started at 15:00 on Sunday.',
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
  loader: ({ context }) => loadRaceWriteup(context.queryClient, RACE_SLUG),
  head: ({ loaderData, match }) =>
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
      news: loaderData?.news?.items,
      search: match.search,
      faqs: FAQS,
    }),
});

function UnitedStatesGrandPrixPredictionsPage() {
  return (
    <StandardRaceWriteup
      data={Route.useLoaderData()}
      raceSlug={RACE_SLUG}
      raceName="United States Grand Prix"
      flagCode="US"
      venueName="Austin"
      signalsHeading={SIGNALS_HEADING}
      timeZone="America/Chicago"
      timeZoneLabel="Austin time"
      summary={
        'Austin opens three races in the Americas, and this year it has no Sprint.'
      }
      reviewedAt={PROSE_REVIEWED_AT}
      faqs={FAQS}
      raceReport={<RaceReport />}
      sources={
        <>
          2026 result:{' '}
          <ExternalSource href={OFFICIAL_RESULT_SOURCE}>
            Formula 1
          </ExternalSource>{' '}
          and{' '}
          <ExternalSource href={RACE_REPORT_SOURCE}>Formula 1</ExternalSource>.{' '}
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
          </ExternalSource>
          ,{' '}
          <ExternalSource href={FERRARI_UPGRADE_RAN_SOURCE}>
            Formula 1
          </ExternalSource>
          ,{' '}
          <ExternalSource href={MERCEDES_ENGINE_SOURCE}>
            Formula 1
          </ExternalSource>{' '}
          and{' '}
          <ExternalSource href={MCLAREN_UPGRADE_SOURCE}>
            Motorsport.com
          </ExternalSource>
          .
        </>
      }
    >
      <StandardWeekend />
      <Circuit />
      <TyreChoice />
      <Upgrades />
      <LastYear />
    </StandardRaceWriteup>
  );
}

/**
 * The archive's account of the race: the result, then what decided it. Every
 * claim is in Formula 1's results page or race report.
 */
function RaceReport() {
  return (
    <RaceWriteupSection id="race-report" heading="What decided the race">
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Kimi Antonelli won from pole, <Figure>13.078 seconds</Figure> ahead of
        Charles Leclerc. Max Verstappen was third, Lewis Hamilton fourth and
        Lando Norris fifth.{' '}
        <ExternalSource href={OFFICIAL_RESULT_SOURCE}>
          The official race result
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Antonelli kept the lead at the start and made one stop, from mediums to
        hards, while many of his rivals stopped twice. Leclerc passed Norris and
        then Verstappen for second late in the race. A Virtual Safety Car for
        Valtteri Bottas&rsquo;s stopped Cadillac put little pressure on
        Antonelli&rsquo;s lead.{' '}
        <ExternalSource href={RACE_REPORT_SOURCE}>
          Read the F1 race report
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

function StandardWeekend() {
  return (
    <RaceWriteupSection
      id="standard-weekend"
      heading="Three practice sessions this time"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Austin ran the Sprint format in 2025, which left teams one hour of
        practice before competitive running began. It is not one of the six
        sprint weekends in 2026, so the weekend had its full three practice
        sessions before qualifying on Saturday afternoon.{' '}
        <ExternalSource href={SPRINT_2026_SOURCE}>
          The 2026 sprint calendar
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        It was the first of three races on consecutive weekends, with Mexico
        City on 1 November and São Paulo on 8 November.
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
        COTA is <Figure>5.513 km</Figure> long with <Figure>20 corners</Figure>,
        and the Grand Prix runs anticlockwise for <Figure>56 laps</Figure>. The
        lap has <Figure>41 metres</Figure> of elevation change, most of it in
        the steep climb from the start line to Turn 1. Several corners borrow
        from other circuits: Turns 3 to 6 are modelled on Silverstone&rsquo;s
        Maggotts and Becketts, and other sections take after Suzuka, Hockenheim
        and Istanbul Park.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s circuit notes
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Turn 1 is wide at the top of the hill and regularly produces overtaking.{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          Formula 1&rsquo;s circuit guide
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Pirelli describes the tyre wear here as mostly thermal, and the
        temperature passed <Figure>30°C</Figure> during the 2024 race. The
        circuit was partially resurfaced that year, which made it smoother. Grip
        builds as rubber goes down over the weekend, and in 2024 that let
        drivers run the Medium longer than the Sprint had suggested.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

/**
 * The plans reported before Austin, kept as a record of what was expected.
 * Only Ferrari's has a sourced outcome; the other two stay worded as what was
 * said before the weekend.
 */
function Upgrades() {
  return (
    <RaceWriteupSection
      id="upgrades"
      heading="Development plans for the closing races"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Before the weekend, The Race reported that Ferrari had scheduled its
        main aerodynamic update for Austin, partly for logistical reasons and
        partly because the layout suits judging whether it works. The team had
        fallen back from the front since its Barcelona win.{' '}
        <ExternalSource href={FERRARI_UPGRADE_SOURCE}>
          The Race on Ferrari&rsquo;s plans
        </ExternalSource>
        . Ferrari brought the package to Austin, with changes to the floor body,
        floor boards, sidepod undercut and diffuser.{' '}
        <ExternalSource href={FERRARI_UPGRADE_RAN_SOURCE}>
          Formula 1 on the upgrade
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Russell served an engine-related grid penalty in Singapore and, after
        that race, said he expected another before the season ends. He named Las
        Vegas as a possibility, with Mercedes still able to choose the round.
        His comments did not confirm a penalty for Austin.{' '}
        <ExternalSource href={MERCEDES_ENGINE_SOURCE}>
          Formula 1 on Russell&rsquo;s engine allocation
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        Before Austin, Motorsport.com reported that McLaren planned to introduce
        upgrades in stages over the closing races, both to regain podium
        contention and to test aerodynamic concepts for 2027. Stella said the
        final three races should show whether wins were possible. The report did
        not specify which parts would arrive in Austin.{' '}
        <ExternalSource href={MCLAREN_UPGRADE_SOURCE}>
          Motorsport.com on McLaren&rsquo;s development plan
        </ExternalSource>
        .
      </p>
    </RaceWriteupSection>
  );
}

/**
 * The 2026 nomination against the 2025 one. Last year's C1 Hard went largely
 * unused, which is the story of this year's choice.
 */
function TyreChoice() {
  return (
    <TyreCompoundSection
      heading="Austin gets the middle three tyres"
      venue="Austin"
      hardest="C2"
    >
      <p className="gpp-reading-copy mt-7 text-text-muted">
        Pirelli has nominated C2, C3 and C4, closing the gap it left last year.
        In 2025 the Hard was the C1, a step further from the Medium, to make one
        stop on the Hard worth trying. Teams relied on the two softer compounds
        instead. Mexico City and São Paulo get the softest three.{' '}
        <ExternalSource href={TYRE_SOURCE}>
          Pirelli&rsquo;s compound selection
        </ExternalSource>
        .
      </p>
    </TyreCompoundSection>
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
    </RaceWriteupSection>
  );
}
