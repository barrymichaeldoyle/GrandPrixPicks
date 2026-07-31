import type { Doc, Id } from '@convex-generated/dataModel';

import { Button } from '@/components/Button/Button';
import { PredictionForm } from '@/components/PredictionForm';

export function LandingTopFivePicker({
  raceId,
  initialDrivers,
  onComplete,
  onCompletionStateChange,
}: {
  raceId: Id<'races'>;
  initialDrivers: Array<Doc<'drivers'>>;
  onComplete: () => void;
  onCompletionStateChange: (complete: boolean) => void;
}) {
  return (
    <PredictionForm
      raceId={raceId}
      initialDrivers={initialDrivers}
      analyticsSource="landing"
      mobileActionFirst
      onComplete={onComplete}
      onCompletionStateChange={onCompletionStateChange}
      enableNavigationBlocker={false}
      renderSaveWall={() => <TopFiveHandoff onContinue={onComplete} />}
    />
  );
}

/**
 * Remains available if someone returns to review their Top 5 before finishing
 * the teammate sequence. Saving happens once, at the end of the combined card.
 */
function TopFiveHandoff({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="mt-4 border-t border-border pt-4" data-testid="save-wall">
      <p className="text-lg font-medium text-text">Top 5 drafted.</p>
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
