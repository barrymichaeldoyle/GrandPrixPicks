import { RaceWriteupActions } from './RaceWriteupActions';
import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';

function closingCopy(phase: RaceWriteupPhase, venueName: string) {
  switch (phase) {
    case 'preview':
    case 'evidence':
      return {
        heading: `Make your ${venueName} picks`,
        body: 'Choose five drivers for qualifying and five for the race. You can change them until each session locks.',
      };
    case 'race-picks':
      return {
        heading: 'Make your race picks',
        body: 'Qualifying picks are locked. You can change your race Top 5 until the race locks.',
      };
    case 'picks-locked':
      return {
        heading: 'Picks are locked',
        body: 'Your qualifying and race picks stay available on the race page while results are processed.',
      };
    case 'finished':
      return {
        heading: `${venueName} results`,
        body: 'See the official Top 5 and how your predictions scored.',
      };
    case 'cancelled':
      return {
        heading: 'Race called off',
        body: 'See the race page for the current status.',
      };
  }
}

export function RaceWriteupClosingPanel({
  phase,
  raceSlug,
  venueName,
}: {
  phase: RaceWriteupPhase;
  raceSlug: string;
  venueName: string;
}) {
  const copy = closingCopy(phase, venueName);

  return (
    <section className="rounded-sm bg-surface px-5 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-7">
      <div>
        <h2 className="font-title text-xl font-medium text-text">
          {copy.heading}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
          {copy.body}
        </p>
      </div>
      <RaceWriteupActions
        compact
        phase={phase}
        raceSlug={raceSlug}
        venueName={venueName}
      />
    </section>
  );
}
