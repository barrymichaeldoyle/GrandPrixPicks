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
  onStartOver,
  draftNoticeTarget,
}: {
  raceId: Id<'races'>;
  initialDrivers: Array<Doc<'drivers'>>;
  /** Fires once the fifth slot is filled. Does not move the player. */
  onComplete: () => void;
  /** The player asking to move on to the teammate battles. */
  onContinue: () => void;
  onCompletionStateChange: (complete: boolean) => void;
  onPicksChange: (picks: Array<Doc<'drivers'>['_id']>) => void;
  /** Extends "Start over" to the whole card, not just this step's draft. */
  onStartOver?: () => void;
  draftNoticeTarget?: HTMLElement | null;
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
      onStartOver={onStartOver}
      draftNoticeTarget={draftNoticeTarget}
      renderActionArea={({ complete }) => (
        <TopFiveHandoff complete={complete} onContinue={onContinue} />
      )}
    />
  );
}

function TopFiveHandoff({
  complete,
  onContinue,
}: {
  complete: boolean;
  onContinue: () => void;
}) {
  if (!complete) {
    return null;
  }

  return (
    <div className="mt-3" data-testid="top5-handoff">
      <Button
        variant="primary"
        size="md"
        className="w-full sm:w-auto"
        onClick={onContinue}
      >
        Continue to teammate battles
      </Button>
    </div>
  );
}
