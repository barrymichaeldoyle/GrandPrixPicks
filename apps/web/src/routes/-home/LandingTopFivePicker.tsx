import type { Doc, Id } from '@convex-generated/dataModel';

import { Button } from '@/components/Button/Button';
import { PredictionForm } from '@/components/PredictionForm';

export function LandingTopFivePicker({
  raceId,
  initialDrivers,
  initialDraftPicks,
  suppressDraftRestoredNotice = false,
  onComplete,
  onContinue,
  onCompletionStateChange,
  onPicksChange,
  onStartOver,
  draftNoticeTarget,
  continueLabel = 'Continue to team-mate picks',
}: {
  raceId: Id<'races'>;
  initialDrivers: Doc<'drivers'>[];
  /** In-memory picks retained across the landing page's auth-provider swap. */
  initialDraftPicks?: Id<'drivers'>[];
  /** A provider remount is not a returning visit, so it needs no restore notice. */
  suppressDraftRestoredNotice?: boolean;
  /** Fires once the fifth slot is filled. Does not move the player. */
  onComplete: () => void;
  /** The player asking to move on to the team-mate battles. */
  onContinue: () => void;
  /**
   * Label for that hand-off. Editing a finished card in the focus overlay is
   * not a hand-off to anything, so it closes back to the card instead.
   */
  continueLabel?: string;
  onCompletionStateChange: (complete: boolean) => void;
  onPicksChange: (picks: Doc<'drivers'>['_id'][]) => void;
  /** Extends "Start over" to the whole card, not just this step's draft. */
  onStartOver?: () => void;
  draftNoticeTarget?: HTMLElement | null;
}) {
  return (
    <PredictionForm
      raceId={raceId}
      initialDrivers={initialDrivers}
      initialDraftPicks={initialDraftPicks}
      suppressDraftRestoredNotice={suppressDraftRestoredNotice}
      analyticsSource="landing"
      mobileActionFirst
      onComplete={onComplete}
      onCompletionStateChange={onCompletionStateChange}
      onPicksChange={onPicksChange}
      enableNavigationBlocker={false}
      onStartOver={onStartOver}
      draftNoticeTarget={draftNoticeTarget}
      renderActionArea={({ complete }) => (
        <TopFiveHandoff
          complete={complete}
          onContinue={onContinue}
          label={continueLabel}
        />
      )}
    />
  );
}

function TopFiveHandoff({
  complete,
  onContinue,
  label,
}: {
  complete: boolean;
  onContinue: () => void;
  label: string;
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
        {label}
      </Button>
    </div>
  );
}
