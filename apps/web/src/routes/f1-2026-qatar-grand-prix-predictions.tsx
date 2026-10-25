import { createFileRoute } from '@tanstack/react-router';

import { ExternalSource } from '@/components/race-writeups/ExternalSource';
import { StandardRaceWriteup } from '@/components/race-writeups/StandardRaceWriteup';
import {
  RACE_WRITEUP_CIRCUIT_ANCHOR,
  RaceWriteupFigure as Figure,
  RaceWriteupSection,
} from '@/components/race-writeups/RaceWriteupSection';
import { lastReviewedAt } from '@/lib/lastReviewed';
import { loadRaceWriteup } from '@/lib/raceWriteupLoader';
import { raceWriteupPageHead } from '@/lib/raceWriteupSeo';
import { getRaceWriteupReviewedAt } from '@/lib/raceWriteups';

const RACE_SLUG = 'qatar-2026';

/**
 * The circuit section's heading, declared once because two places use it:
 * the section itself and the hero link that scrolls to it.
 */
const SIGNALS_HEADING = 'The Lusail International Circuit';
const PATH = '/f1-2026-qatar-grand-prix-predictions';
const PROSE_REVIEWED = getRaceWriteupReviewedAt(RACE_SLUG);
const PROSE_REVIEWED_AT = lastReviewedAt(PROSE_REVIEWED);

const F1_EVENT_SOURCE = 'https://www.formula1.com/en/racing/2026/qatar';
/** Pirelli's 2025 preview: the layout, the heat, the compounds and the 2024 race. */
const PIRELLI_2025_SOURCE =
  'https://press.pirelli.com/another-desert-this-time-in-doha/';
/** Pirelli's 2025 prescription: the 25-lap limit per set and why. */
const PIRELLI_LAP_LIMIT_SOURCE =
  'https://press.pirelli.com/a-maximum-of-25-laps-per-tyre-set-in-qatar/';
const RACE_2025_SOURCE =
  'https://www.formula1.com/en/latest/article/verstappen-wins-qatar-gp-as-title-battle-goes-to-abu-dhabi-with-piastri.5KlYT7q8OcrJ7AnMALjkxJ';
const RESULT_2025_SOURCE =
  'https://www.formula1.com/en/results/2025/races/1275/qatar/race-result';

/*
 * Weekend facts only, per the note on the Singapore write-up: the scoring
 * rules belong to `/how-to-play` and `/results-policy`, and repeating them on
 * every write-up is the cross-page duplication the SEO policy exists to stop.
 */
const FAQS = [
  {
    question: 'When is the 2026 Qatar Grand Prix?',
    answer:
      'The race starts at 19:00 Qatar time on Sunday 29 November 2026. Practice begins on Friday 27 November, and qualifying starts at 21:00 on Saturday 28 November.',
  },
  {
    question: 'Who won the 2025 Qatar Grand Prix?',
    answer:
      'Max Verstappen, from third on the grid. Oscar Piastri and Carlos Sainz completed the podium after McLaren kept both cars out under an early Safety Car.',
  },
] as const;

export const Route = createFileRoute('/f1-2026-qatar-grand-prix-predictions')({
  component: QatarGrandPrixPredictionsPage,
  loader: ({ context }) => loadRaceWriteup(context.queryClient, RACE_SLUG),
  head: ({ loaderData, match }) =>
    raceWriteupPageHead({
      path: PATH,
      raceSlug: RACE_SLUG,
      title: '2026 Qatar Grand Prix Predictions & Picks | Lusail',
      description: {
        live: 'Make your 2026 Qatar Grand Prix predictions. A night race in Doha heat on a circuit that wears tyres out, a year after a 25-lap limit forced two stops.',
        finished:
          '2026 Qatar Grand Prix predictions scored against the official classification. See who called the top 5 at Lusail and how the pit stops decided it.',
        cancelled: 'The 2026 Qatar Grand Prix was called off.',
      },
      imageAlt:
        'Grand Prix Picks race card for the 2026 Qatar Grand Prix at the Lusail International Circuit.',
      reviewedAt: PROSE_REVIEWED_AT,
      eventName: '2026 Qatar Grand Prix',
      breadcrumbName: 'Qatar Grand Prix predictions',
      race: loaderData?.race,
      news: loaderData?.news?.items,
      search: match.search,
      faqs: FAQS,
    }),
});

function QatarGrandPrixPredictionsPage() {
  return (
    <StandardRaceWriteup
      data={Route.useLoaderData()}
      raceSlug={RACE_SLUG}
      raceName="Qatar Grand Prix"
      flagCode="QA"
      venueName="Lusail"
      signalsHeading={SIGNALS_HEADING}
      timeZone="Asia/Qatar"
      timeZoneLabel="Qatar time"
      summary={
        'A night race in Doha heat on a circuit built for motorcycles, one of the hardest on tyres all season, where the pit stops decide the order.'
      }
      reviewedAt={PROSE_REVIEWED_AT}
      faqs={FAQS}
      sources={
        <>
          Schedule and circuit:{' '}
          <ExternalSource href={F1_EVENT_SOURCE}>Formula 1</ExternalSource>.
          Circuit, heat and tyres:{' '}
          <ExternalSource href={PIRELLI_2025_SOURCE}>Pirelli</ExternalSource>{' '}
          and{' '}
          <ExternalSource href={PIRELLI_LAP_LIMIT_SOURCE}>
            Pirelli
          </ExternalSource>
          . 2025 race and classification:{' '}
          <ExternalSource href={RACE_2025_SOURCE}>Formula 1</ExternalSource> and{' '}
          <ExternalSource href={RESULT_2025_SOURCE}>Formula 1</ExternalSource>.
        </>
      }
    >
      <Circuit />
      <Tyres />
      <LastYear />
    </StandardRaceWriteup>
  );
}

/**
 * The circuit's figures, written into the prose in bold. The start time is in
 * the hero's schedule card and is not repeated here. The race page's circuit
 * guide already says the track is fast, flowing and hard on tyres, so this
 * section carries the numbers and the weekend format instead.
 */
function Circuit() {
  return (
    <RaceWriteupSection
      id={RACE_WRITEUP_CIRCUIT_ANCHOR}
      heading={SIGNALS_HEADING}
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        The lap is <Figure>5.419 km</Figure> with <Figure>16 corners</Figure>,
        ten of them right-handers, and the Grand Prix runs for{' '}
        <Figure>57 laps</Figure>. The main straight is over a kilometre long,
        and the braking zone at the end of it into Turn 1 is where most of the
        overtaking happens. The rest of the lap is a run of medium and
        high-speed corners, and the stretch from Turns 12 to 14 is the part that
        works the tyres hardest.{' '}
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
        The race is at night, but the heat and humidity are closer to Singapore
        than to Las Vegas the week before: the track keeps the heat of the day,
        and in past years some drivers have felt unwell by the finish. Sand
        blows onto the circuit from the desert, so grip changes through the
        weekend. In 2025 Qatar was the last sprint of the season. In 2026 it is
        a standard weekend with three practice sessions.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>{' '}
        and{' '}
        <ExternalSource href={F1_EVENT_SOURCE}>
          the 2026 schedule
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
      heading="A lap limit on every set forced two stops in 2025"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Pirelli has only ever brought its three hardest compounds here, C1, C2
        and C3, because the energy the tyres take through the fast corners is
        close to Suzuka&rsquo;s. The surface is smooth, which tends to produce
        graining, and that in turn produces a high wear rate.{' '}
        <ExternalSource href={PIRELLI_2025_SOURCE}>
          Pirelli&rsquo;s 2025 preview
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        In 2024 the field managed its tyres well enough to make a one-stop race
        work, and several tyres, the left fronts in particular, reached the
        maximum wear level in doing so. For 2025 Pirelli, the FIA and Formula 1
        responded with a limit of <Figure>25 laps</Figure> per set across the
        whole weekend, counted through every session including laps behind the
        Safety Car. Over 57 laps that meant at least two pit stops for everyone,
        and Pirelli told each team before the start how many laps each set had
        left. A similar limit had been used in 2023, when the kerbs were cutting
        the sidewalls; the kerbs were changed for 2024. Whether the limit
        returns in 2026 is announced in the two weeks before the race.{' '}
        <ExternalSource href={PIRELLI_LAP_LIMIT_SOURCE}>
          Pirelli&rsquo;s 2025 prescription
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
      heading="Verstappen won from third while McLaren stayed out"
    >
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Oscar Piastri started from pole with Lando Norris beside him, and Max
        Verstappen passed Norris on the run to Turn 1 from third. A few laps in,
        Nico H&uuml;lkenberg and Pierre Gasly collided at Turn 1 and the Safety
        Car came out just inside the window where the remaining 50 laps could be
        covered with one more stop. Everyone pitted for the first of their two
        mandatory stops except the two McLarens, which stayed out and still had
        both stops to make. Piastri got back to second on fresh tyres; Norris
        came out behind Carlos Sainz and Kimi Antonelli and only passed
        Antonelli on the penultimate lap. Verstappen won by eight seconds and
        took the title fight to Abu Dhabi.{' '}
        <ExternalSource href={RACE_2025_SOURCE}>
          The 2025 race report
        </ExternalSource>
        .
      </p>
      <p className="gpp-reading-copy mt-3 text-text-muted">
        The official top five was Verstappen, Piastri, Sainz, Norris and
        Antonelli. Sainz&rsquo;s third was his second podium of the season for
        Williams. Verstappen has won the last three races here, and Lewis
        Hamilton won the first, from pole, in 2021.{' '}
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
