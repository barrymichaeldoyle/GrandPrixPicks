import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';

import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { useQuery } from '@/integrations/convex/query';
import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';

import { RaceWriteupActions } from './RaceWriteupActions';
import { RaceWriteupNextLinks } from './RaceWriteupNextLinks';

/**
 * Whether the reader still has something to do here.
 *
 * The phases that still take a pick vary by viewer, and so does the finished
 * one, where a player has scores to see and anyone else has results. While
 * picks are locked the panel says the same thing to everyone, because the fact
 * it is reporting is about the weekend rather than about the reader.
 */
function closingCopy(
  phase: RaceWriteupPhase,
  venueName: string,
  viewer: { isSignedIn: boolean; hasPicks: boolean },
) {
  switch (phase) {
    case 'preview':
    case 'evidence':
      if (viewer.hasPicks) {
        return {
          heading: `Your ${venueName} picks are in`,
          body: 'You can change them until each session locks.',
        };
      }
      return {
        heading: `Make your ${venueName} picks`,
        body: viewer.isSignedIn
          ? 'Choose five drivers for qualifying and five for the race. You can change them until each session locks.'
          : 'Choose five drivers for qualifying and five for the race. Saving them needs a free account.',
      };
    case 'race-picks':
      if (viewer.hasPicks) {
        return {
          heading: 'Your race picks are in',
          body: 'Qualifying is locked. You can change your race Top 5 until the race locks.',
        };
      }
      return {
        heading: 'Make your race picks',
        body: viewer.isSignedIn
          ? 'Qualifying picks are locked. You can change your race Top 5 until the race locks.'
          : 'Qualifying picks are locked. The race Top 5 is still open, and saving it needs a free account.',
      };
    case 'picks-locked':
      return {
        heading: 'Picks are locked',
        body: 'Your qualifying and race picks stay available on the race page while results are processed.',
      };
    case 'finished':
      // By viewer, like the phases above: "how your predictions scored" was
      // said to every reader, and most readers of a write-up made none.
      if (viewer.hasPicks) {
        return {
          heading: `How your ${venueName} picks scored`,
          body: 'The race page scores each of your picks, session by session.',
        };
      }
      return {
        heading: `${venueName} results`,
        body: 'The race page has every session’s result and the team-mate battles.',
      };
    case 'cancelled':
      return {
        heading: 'Race called off',
        body: 'See the race page for the current status.',
      };
  }
}

/**
 * The panel that ends a race write-up.
 *
 * It knows the weekend's phase and, since the write-ups are what search sends
 * people to, now also who is reading. A signed-in player who had already picked
 * this round was being told to go and make picks, which reads as a site that
 * does not know them; `raceId` is what lets it say otherwise.
 *
 * The prediction lookup is viewer-scoped and therefore client-only: it returns
 * null for an anonymous reader rather than throwing, so the write-up routes
 * stay Clerk-free and the panel server-renders its signed-out wording. When the
 * query resolves for a signed-in reader the panel settles on the state that
 * mentions their picks. Nothing below depends on it — the primary action goes
 * to the same race page either way — so the correction is a wording change, not
 * a layout shift.
 */
export function RaceWriteupClosingPanel({
  phase,
  raceId,
  raceSlug,
  venueName,
}: {
  phase: RaceWriteupPhase;
  raceId?: Id<'races'>;
  raceSlug: string;
  venueName: string;
}) {
  const { isSignedIn } = useViewerSession();
  const weekendPredictions = useQuery(
    api.predictions.myWeekendPredictions,
    isSignedIn && raceId ? { raceId } : 'skip',
  );
  const hasPicks = Object.values(weekendPredictions?.predictions ?? {}).some(
    (picks) => picks != null,
  );
  const copy = closingCopy(phase, venueName, { isSignedIn, hasPicks });

  return (
    <section className="rounded-sm bg-surface px-5 py-7 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-7">
      <div>
        <h2 className="font-title text-xl font-medium text-text">
          {copy.heading}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">
          {copy.body}
        </p>
        <RaceWriteupNextLinks
          placement="closing_panel"
          raceSlug={raceSlug}
          venueName={venueName}
        />
      </div>
      <RaceWriteupActions
        compact
        hasPicks={hasPicks}
        phase={phase}
        raceSlug={raceSlug}
        venueName={venueName}
      />
    </section>
  );
}
