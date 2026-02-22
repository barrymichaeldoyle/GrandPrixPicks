import confetti from 'canvas-confetti';
import { useMutation, useQuery } from 'convex/react';
import { Check, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { SessionType } from '../lib/sessions';
import { Button } from './Button';
import { H2HMatchupGrid } from './H2HMatchupGrid';
import { InlineLoader } from './InlineLoader';

interface H2HPredictionFormProps {
  raceId: Id<'races'>;
  /** If provided, only update this specific session. Otherwise cascade to all. */
  sessionType?: SessionType;
  /** Existing picks keyed by matchupId → predictedWinnerId. */
  existingPicks?: Record<string, Id<'drivers'>>;
  /** Called after a successful submit (e.g. to close an edit view). */
  onSuccess?: () => void;
  /** Emits whether the form currently has unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void;
}

export function H2HPredictionForm({
  raceId,
  sessionType,
  existingPicks,
  onSuccess,
  onDirtyChange,
}: H2HPredictionFormProps) {
  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);

  const [selections, setSelections] = useState<Record<string, Id<'drivers'>>>(
    existingPicks ?? {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync with existing picks when they load
  useEffect(() => {
    if (existingPicks && Object.keys(existingPicks).length > 0) {
      setSelections(existingPicks);
    }
  }, [existingPicks]);

  if (matchups === undefined) {
    return <InlineLoader />;
  }

  const totalMatchups = matchups.length;
  const selectedCount = Object.keys(selections).length;
  const allSelected = selectedCount === totalMatchups;

  const toggleSelection = (
    matchupId: Id<'h2hMatchups'>,
    driverId: Id<'drivers'>,
  ) => {
    setSelections((prev) => ({
      ...prev,
      [matchupId]: driverId,
    }));
    setSubmitStatus('idle');
  };

  const handleSubmit = async () => {
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
      if (existingPicks && Object.keys(existingPicks).length > 0) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
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
  };

  const hasChanges = existingPicks
    ? JSON.stringify(selections) !== JSON.stringify(existingPicks)
    : selectedCount > 0;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

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
          ? 'Update H2H Predictions'
          : 'Submit H2H Predictions'}
    </Button>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Pick which teammate finishes ahead in each pairing.
      </p>

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
    </div>
  );
}
