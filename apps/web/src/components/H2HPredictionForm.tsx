import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { getWebH2HDraftStorageKey } from '@grandprixpicks/shared/picks';
import confetti from 'canvas-confetti';
import { useMutation } from 'convex/react';
import { Check, Save } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  clearPredictionDraft,
  loadPredictionDraft,
  savePredictionDraft,
} from '@/lib/predictionDrafts';
import { toUserFacingMessage } from '@/lib/userFacingError';

import type { SessionType } from '../lib/sessions';
import { Button } from './Button/Button';
import { H2HMatchupGrid } from './H2HMatchupGrid';

interface H2HPredictionFormProps {
  raceId: Id<'races'>;
  matchups: ComponentProps<typeof H2HMatchupGrid>['matchups'];
  /** If provided, only update this specific session. Otherwise cascade to all. */
  sessionType?: SessionType;
  /** Existing picks keyed by matchupId → predictedWinnerId. */
  existingPicks?: Record<string, Id<'drivers'>>;
  /** Called after a successful submit (e.g. to close an edit view). */
  onSuccess?: () => void;
  /** Emits whether the form currently has unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void;
}

type H2HDraft = {
  selections: Record<string, Id<'drivers'>>;
  updatedAt: string;
};

export function H2HPredictionForm({
  raceId,
  matchups,
  sessionType,
  existingPicks,
  onSuccess,
  onDirtyChange,
}: H2HPredictionFormProps) {
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const draftKey = getWebH2HDraftStorageKey(raceId, sessionType);

  const [selections, setSelections] = useState<Record<string, Id<'drivers'>>>(
    existingPicks ?? {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  useEffect(() => {
    const draft = loadPredictionDraft<H2HDraft>(draftKey);
    if (draft && Object.keys(draft.selections).length > 0) {
      setSelections(draft.selections);
      setRestoredDraftAt(draft.updatedAt);
    } else {
      setSelections(existingPicks ?? {});
      setRestoredDraftAt(null);
    }
    setHasHydratedDraft(true);
  }, [draftKey, existingPicks]);

  const totalMatchups = matchups.length;
  const selectedCount = Object.keys(selections).length;
  const allSelected = selectedCount === totalMatchups;

  function toggleSelection(
    matchupId: Id<'h2hMatchups'>,
    driverId: Id<'drivers'>,
  ) {
    setSelections((prev) => ({
      ...prev,
      [matchupId]: driverId,
    }));
    setSubmitStatus('idle');
  }

  async function handleSubmit() {
    if (!allSelected) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const picks = Object.entries(selections).map(
        ([matchupId, predictedWinnerId]) => ({
          matchupId: matchupId as Id<'h2hMatchups'>,
          predictedWinnerId,
        }),
      );
      await submitH2H({ raceId, picks, sessionType });
      captureAnalyticsEvent('h2h_prediction_submitted', {
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
        is_edit: Boolean(
          existingPicks && Object.keys(existingPicks).length > 0,
        ),
        restored_draft: Boolean(restoredDraftAt),
        matchup_count: totalMatchups,
      });
      setSubmitStatus('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
      clearPredictionDraft(draftKey);
      setRestoredDraftAt(null);
      onSuccess?.();
    } catch (error) {
      captureAnalyticsEvent('h2h_prediction_submit_failed', {
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
        is_edit: Boolean(
          existingPicks && Object.keys(existingPicks).length > 0,
        ),
        restored_draft: Boolean(restoredDraftAt),
        matchup_count: totalMatchups,
      });
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? toUserFacingMessage(error)
          : 'Failed to submit H2H predictions',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasChanges = existingPicks
    ? JSON.stringify(selections) !== JSON.stringify(existingPicks)
    : selectedCount > 0;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    if (hasChanges) {
      savePredictionDraft<H2HDraft>(draftKey, {
        selections,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    clearPredictionDraft(draftKey);
  }, [draftKey, hasChanges, hasHydratedDraft, selections]);

  const isUnchangedFromSaved = Boolean(
    existingPicks &&
    Object.keys(existingPicks).length === totalMatchups &&
    allSelected &&
    !hasChanges,
  );

  const submitButtonProps = {
    variant: 'primary' as const,
    loading: isSubmitting,
    saved: isUnchangedFromSaved,
    disabled: !allSelected || isSubmitting || isUnchangedFromSaved,
    onClick: handleSubmit,
    leftIcon: isUnchangedFromSaved ? Check : Save,
    'data-testid': 'h2h-submit-button',
    children: isUnchangedFromSaved
      ? 'Saved'
      : existingPicks && Object.keys(existingPicks).length > 0
        ? 'Save H2H Changes'
        : 'Save H2H Predictions',
  };

  const desktopSubmitButton = (
    <Button
      {...submitButtonProps}
      size="md"
      className="w-100 max-w-full"
    />
  );

  const mobileSubmitButton = (
    <Button {...submitButtonProps} size="sm" className="w-full" />
  );

  function handleDiscardDraft() {
    captureAnalyticsEvent('h2h_prediction_draft_discarded', {
      race_id: raceId,
      session_type: sessionType ?? 'cascade',
      matchup_count: totalMatchups,
    });
    setSelections(existingPicks ?? {});
    setSubmitStatus('idle');
    setErrorMessage('');
    setRestoredDraftAt(null);
    clearPredictionDraft(draftKey);
  }

  return (
    <>
      {restoredDraftAt ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/35 bg-accent-muted/20 px-3 py-2">
          <span className="text-xs text-text">Unsaved draft restored</span>
          <Button variant="text" size="inline" onClick={handleDiscardDraft}>
            Discard Draft
          </Button>
        </div>
      ) : null}
      <H2HMatchupGrid
        matchups={matchups}
        selections={selections}
        mode="interactive"
        onSelect={toggleSelection}
        actionCard={
          <div className="hidden items-stretch sm:flex">
            <div className="flex w-full items-center justify-center p-3">
              {desktopSubmitButton}
            </div>
          </div>
        }
      />

      {/* Submit row — sticky on mobile so progress + save stay visible while
          scrolling the long matchup list. The -mx-3/-mb-4 pair mirrors the
          page container's mobile padding (px-3 py-4 in RaceEventPageLayout)
          so the bar sits flush without extra dead space above the footer. */}
      <div className="sticky bottom-0 z-10 -mx-3 -mb-4 border-t border-border bg-page/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:static sm:z-auto sm:mx-0 sm:mb-0 sm:border-t-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:backdrop-blur-none">
        <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3">
          {!allSelected && (
            <span className="text-center text-sm text-text-muted sm:w-auto">
              {totalMatchups - selectedCount} matchup
              {totalMatchups - selectedCount !== 1 ? 's' : ''} remaining
            </span>
          )}

          <div className="sm:hidden">{mobileSubmitButton}</div>

          {submitStatus === 'success' && (
            <span
              className="text-sm text-success"
              aria-live="polite"
              data-testid="h2h-submit-success"
            >
              H2H picks saved.
            </span>
          )}

          {submitStatus === 'error' && (
            <span className="text-sm text-error">{errorMessage}</span>
          )}
        </div>
      </div>
    </>
  );
}
