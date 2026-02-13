import confetti from 'canvas-confetti';
import { useMutation, useQuery } from 'convex/react';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { SessionType } from '../lib/sessions';
import { Button } from './Button';
import { TEAM_COLORS } from './DriverBadge';
import { Flag } from './Flag';
import { InlineLoader } from './InlineLoader';

interface H2HPredictionFormProps {
  raceId: Id<'races'>;
  /** If provided, only update this specific session. Otherwise cascade to all. */
  sessionType?: SessionType;
  /** Existing picks keyed by matchupId → predictedWinnerId. */
  existingPicks?: Record<string, Id<'drivers'>>;
  /** Called after a successful submit (e.g. to close an edit view). */
  onSuccess?: () => void;
}

export function H2HPredictionForm({
  raceId,
  sessionType,
  existingPicks,
  onSuccess,
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
    if (!allSelected) return;

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
          ? error.message
          : 'Failed to submit H2H predictions',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = existingPicks
    ? JSON.stringify(selections) !== JSON.stringify(existingPicks)
    : selectedCount > 0;

  const isUnchangedFromSaved = Boolean(
    existingPicks &&
    Object.keys(existingPicks).length === totalMatchups &&
    allSelected &&
    !hasChanges,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Pick which teammate finishes ahead in each pairing.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {matchups.map((matchup) => {
          const selected = selections[matchup._id];
          const teamColor = TEAM_COLORS[matchup.team] ?? '#666';

          return (
            <div
              key={matchup._id}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              {/* Team header */}
              <div
                className="px-3 py-1.5 text-xs font-bold tracking-wider text-white uppercase"
                style={{ backgroundColor: teamColor }}
              >
                {displayTeamName(matchup.team)}
              </div>

              {/* Driver options: whole area is clickable, with "Pick" label beside content */}
              <div className="flex">
                {[matchup.driver1, matchup.driver2].map((driver) => {
                  const isSelected = selected === driver._id;
                  return (
                    <button
                      key={driver._id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${displayTeamName(matchup.team)}: Pick ${driver.displayName}`}
                      onClick={() => toggleSelection(matchup._id, driver._id)}
                      className={`relative flex flex-1 flex-col items-stretch px-3 py-2 transition-all ${
                        isSelected
                          ? 'bg-accent-muted ring-2 ring-accent ring-inset'
                          : 'hover:bg-surface-muted'
                      } ${driver === matchup.driver1 ? 'border-r border-border' : ''}`}
                    >
                      {/* Left-aligned: badge (with number under) + name top-aligned next to it */}
                      <div className="flex min-w-0 flex-1 items-start justify-start gap-x-1.5">
                        <div className="flex shrink-0 flex-col items-center">
                          <span
                            className="rounded px-1 py-0.5 font-mono text-xs font-bold text-white"
                            style={{ backgroundColor: teamColor }}
                          >
                            {driver.code}
                          </span>
                          {driver.number != null && (
                            <span className="mt-0.5 text-[10px] text-text-muted">
                              #{driver.number}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 items-center gap-1 pt-0.5">
                          {driver.nationality && (
                            <Flag code={driver.nationality} size="xs" />
                          )}
                          <span className="truncate text-xs text-text">
                            {driver.displayName.split(' ').pop()}
                          </span>
                        </div>
                      </div>
                      {/* Bottom right: "Pick" or check + "Picked" (inside button padding so card overflow doesn't clip) */}
                      <span className="absolute right-3 bottom-1.5 flex shrink-0 items-center justify-end gap-1 text-right text-xs font-semibold">
                        {isSelected ? (
                          <>
                            <Check
                              size={12}
                              className="shrink-0 text-accent"
                              strokeWidth={3}
                            />
                            <span className="text-accent">Picked</span>
                          </>
                        ) : (
                          <span className="text-accent">Pick</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="primary"
          size="md"
          className="w-100 max-w-full"
          loading={isSubmitting}
          saved={isUnchangedFromSaved}
          disabled={!allSelected || isSubmitting || isUnchangedFromSaved}
          onClick={handleSubmit}
        >
          {isUnchangedFromSaved ? (
            <>
              <Check size={20} className="shrink-0" />
              Saved
            </>
          ) : isSubmitting ? (
            'Saving...'
          ) : existingPicks && Object.keys(existingPicks).length > 0 ? (
            'Update H2H Predictions'
          ) : (
            'Submit H2H Predictions'
          )}
        </Button>

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
