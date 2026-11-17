import type { Doc, Id } from '@convex-generated/dataModel';

import { Button } from '@/components/Button/Button';
import { PicksFormActionRow } from '@/components/PicksSaveStatus';
import {
  PredictionForm,
  type SaveState,
} from '@/components/PredictionForm/PredictionForm';
import { pickMoreLabel } from '@/components/PredictionForm/SubmitRow';

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
  hidePicksHeading = false,
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
  /** The focus overlay already supplies the Top 5 heading. */
  hidePicksHeading?: boolean;
}) {
  return (
    <PredictionForm
      raceId={raceId}
      initialDrivers={initialDrivers}
      initialDraftPicks={initialDraftPicks}
      suppressDraftRestoredNotice={suppressDraftRestoredNotice}
      analyticsSource="landing"
      mobileActionFirst
      hidePicksHeading={hidePicksHeading}
      inlineSaveStatus={hidePicksHeading}
      onComplete={onComplete}
      onCompletionStateChange={onCompletionStateChange}
      onPicksChange={onPicksChange}
      enableNavigationBlocker={false}
      onStartOver={onStartOver}
      draftNoticeTarget={draftNoticeTarget}
      renderActionArea={({ complete, picksLeft, submit, saveState }) => (
        <TopFiveHandoff
          complete={complete}
          picksLeft={picksLeft}
          saveState={saveState}
          onContinue={onContinue}
          label={continueLabel}
          showSave={showSave}
          showSaveStatus={!hidePicksHeading}
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
  picksLeft,
  saveState,
  onContinue,
  label,
  showSave,
  showSaveStatus,
  onSave,
}: {
  complete: boolean;
  picksLeft: number;
  saveState: SaveState;
  onContinue: () => void;
  label: string;
  showSave: boolean;
  showSaveStatus: boolean;
  onSave: () => void;
}) {
  if (!showSave) {
    return (
      <PicksFormActionRow
        complete={complete}
        saveState={saveState}
        primaryLabel={label}
        onPrimary={onContinue}
        showSaveStatus={showSaveStatus}
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
        {/* Stacked and full width: this sits in the narrow "Your picks"
            column, where two buttons side by side broke "team-mate" across
            lines. Until the Top 5 is complete the save button says what it
            is waiting for, the same as the race page's. A greyed "Sign in to
            save your picks" read as a wall in front of an unfinished form. */}
        <div className="flex w-full flex-col gap-3">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            disabled={!complete}
            onClick={onSave}
            data-testid="top5-save"
          >
            {complete ? 'Sign in to save your picks' : pickMoreLabel(picksLeft)}
          </Button>
          {complete ? (
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={onContinue}
            >
              {label}
            </Button>
          ) : null}
        </div>
      </PicksFormActionRow>
      {/* What the sign-in is for. 11 of about 19 visitors who finished a Top
          5 here in the 30 days to 2026-11-16 left without pressing anything,
          and nothing on this screen said what a saved pick earns.

          Rendered only once the Top 5 is complete, with the second button
          above it. It used to hold its height while invisible, which left a
          blank band under every unfinished picker; appearing on the
          visitor's own tap is not a layout shift. */}
      {complete ? (
        <p className="mt-3 text-sm text-text-muted">
          Scored after each session, up to 25 points. Your picks are kept when
          you sign in. Team-mate picks are optional.
        </p>
      ) : null}
    </>
  );
}
