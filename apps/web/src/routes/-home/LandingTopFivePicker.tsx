import type { Doc, Id } from '@convex-generated/dataModel';

import { Button } from '@/components/Button/Button';
import { PicksFormActionRow } from '@/components/PicksSaveStatus';
import { PredictionForm, type SaveState } from '@/components/PredictionForm';

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
  continueLabel = 'Add team-mate picks',
  onSaveIntent,
  showSave = false,
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
  /** Funnel bookkeeping, before a Top 5 is submitted without the duels. */
  onSaveIntent?: () => void;
  /**
   * Offer submitting the Top 5 on its own, with the duels as the second,
   * optional action. Off in the edit overlay, which is not a funnel step.
   */
  showSave?: boolean;
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
      renderActionArea={({ complete, submit, saveState }) => (
        <TopFiveHandoff
          complete={complete}
          saveState={saveState}
          onContinue={onContinue}
          label={continueLabel}
          showSave={showSave}
          onSave={() => {
            onSaveIntent?.();
            submit();
          }}
        />
      )}
    />
  );
}

/**
 * What a finished Top 5 can do next.
 *
 * Submitting comes first and the duels second, because the duels used to be
 * the only way out of this step: the sole submit button on the landing card
 * lived at the foot of eleven team-mate battles, so a visitor who had ranked
 * five drivers could not keep them without answering eleven more questions.
 * Six of the eleven people who finished a Top 5 in the 60 days to 2026-09-08
 * never reached that button.
 *
 * The duels stay, as the secondary action, because the people who do want them
 * are already in flow and the entry event still fires the same way.
 */
function TopFiveHandoff({
  complete,
  saveState,
  onContinue,
  label,
  showSave,
  onSave,
}: {
  complete: boolean;
  saveState: SaveState;
  onContinue: () => void;
  label: string;
  showSave: boolean;
  onSave: () => void;
}) {
  if (!showSave) {
    return (
      <PicksFormActionRow
        complete={complete}
        saveState={saveState}
        primaryLabel={label}
        onPrimary={onContinue}
      />
    );
  }

  return (
    <>
      <PicksFormActionRow
        complete={complete}
        saveState={saveState}
        showSaveStatus={false}
      >
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            disabled={!complete}
            onClick={onSave}
            data-testid="top5-save"
          >
            Sign in to submit
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            disabled={!complete}
            onClick={onContinue}
          >
            {label}
          </Button>
        </div>
      </PicksFormActionRow>
      <p
        className={`mt-3 text-sm text-text-muted ${complete ? '' : 'invisible'}`}
        aria-hidden={!complete}
      >
        Free to play. Your picks are kept when you sign in. Team-mate picks are
        optional and score separately.
      </p>
    </>
  );
}
