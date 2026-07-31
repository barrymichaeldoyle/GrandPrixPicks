import type { Doc, Id } from '@convex-generated/dataModel';

import { Button } from '@/components/Button/Button';
import { PredictionForm } from '@/components/PredictionForm';

export function LandingTopFivePicker({
  raceId,
  initialDrivers,
  onComplete,
  onContinue,
  onCompletionStateChange,
  onPicksChange,
}: {
  raceId: Id<'races'>;
  initialDrivers: Array<Doc<'drivers'>>;
  /** Fires once the fifth slot is filled. Does not move the player. */
  onComplete: () => void;
  /** The player asking to move on to the teammate battles. */
  onContinue: () => void;
  onCompletionStateChange: (complete: boolean) => void;
  onPicksChange: (picks: Array<Doc<'drivers'>['_id']>) => void;
}) {
  return (
    <PredictionForm
      raceId={raceId}
      initialDrivers={initialDrivers}
      analyticsSource="landing"
      mobileActionFirst
      onComplete={onComplete}
      onCompletionStateChange={onCompletionStateChange}
      onPicksChange={onPicksChange}
      enableNavigationBlocker={false}
      renderSaveWall={() => <TopFiveHandoff onContinue={onContinue} />}
    />
  );
}

/**
 * The end of step one. This used to be unreachable: filling the fifth slot
 * swapped the whole panel to the teammate battles 360ms later, which arrived
 * as something being taken away rather than something being finished. The
 * player now gets their completed order to look at and moves on when ready.
 * Saving still happens once, at the end of the combined card.
 */
function TopFiveHandoff({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mt-4 border-t border-border pt-4" data-testid="save-wall">
      <p className="text-lg font-medium text-text">
        Top 5 drafted. Reorder it while you can.
      </p>
      <p className="gpp-reading-copy mt-1 text-text-muted">
        Call the teammate battles to finish your prediction card.
      </p>
      <div className="mt-4">
        <Button variant="primary" size="md" onClick={onContinue}>
          Continue to teammate picks
        </Button>
      </div>
    </div>
  );
}
