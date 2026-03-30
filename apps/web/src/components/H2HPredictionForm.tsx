import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { getWebH2HDraftStorageKey } from '@grandprixpicks/shared/picks';
import confetti from 'canvas-confetti';
import { useMutation } from 'convex/react';
import { Check, Save } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';

import {
  clearPredictionDraft,
  loadPredictionDraft,
  savePredictionDraft,
} from '@/lib/predictionDrafts';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { formatDateTime } from '../lib/date';
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

  const submitButton = (
    <Button
      variant="primary"
      size="md"
      className="w-100 max-w-full"
      loading={isSubmitting}
      saved={isUnchangedFromSaved}
      disabled={!allSelected || isSubmitting || isUnchangedFromSaved}
      onClick={handleSubmit}
      leftIcon={isUnchangedFromSaved ? Check : Save}
    >
      {isUnchangedFromSaved
        ? 'Saved'
        : existingPicks && Object.keys(existingPicks).length > 0
          ? 'Save H2H Changes'
          : 'Save H2H Predictions'}
    </Button>
  );

  function handleDiscardDraft() {
    setSelections(existingPicks ?? {});
    setSubmitStatus('idle');
    setErrorMessage('');
    setRestoredDraftAt(null);
    clearPredictionDraft(draftKey);
  }

  return (
    <>
      {restoredDraftAt ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/35 bg-accent-muted/20 px-3 py-2">
          <span className="text-xs text-text">
            Draft restored: {formatDateTime(restoredDraftAt)}
          </span>
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
              {submitButton}
            </div>
          </div>
        }
      />

      {/* Submit row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="sm:hidden">{submitButton}</div>

        {submitStatus === 'success' && (
          <span className="text-sm text-success" aria-live="polite">
            H2H picks saved.
          </span>
        )}

        {!allSelected && (
          <span className="text-sm text-text-muted">
            {totalMatchups - selectedCount} matchup
            {totalMatchups - selectedCount !== 1 ? 's' : ''} remaining
          </span>
        )}

        {submitStatus === 'error' && (
          <span className="text-sm text-error">{errorMessage}</span>
        )}
      </div>
    </>
  );
}
