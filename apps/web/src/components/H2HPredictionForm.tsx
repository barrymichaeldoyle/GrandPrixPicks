import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { getWebH2HDraftStorageKey } from '@grandprixpicks/shared/picks';
import { useConvexAuth, useMutation } from 'convex/react';
import { Check, Save } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useAutoSaveOnFirstComplete } from '@/hooks/useAutoSaveOnFirstComplete';
import { useClerkRuntimeControl } from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  clearPendingSubmit,
  clearPredictionDraft,
  hasPendingSubmit,
  loadPredictionDraft,
  savePredictionDraft,
  setPendingSubmit,
} from '@/lib/predictionDrafts';
import { toUserFacingMessage } from '@/lib/userFacingError';

import type { SessionType } from '@/lib/sessions';
import { Button } from './Button/Button';
import { DraftRestoredNotice } from './DraftRestoredNotice';
import { H2HDuelPicker } from './H2HDuelPicker';
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
  analyticsSource?: 'landing';
  /** Landing funnel attribution for manual entry versus the Top 5 handoff. */
  entryMethod?: 'manual' | 'top5_handoff';
  /** Called when the user explicitly asks to save this prediction card. */
  onSaveIntent?: () => void;
  /** Replaces the signed-out submit button after every duel is selected. */
  renderSaveWall?: (actions: { lockIn: () => void }) => ReactNode;
  /** Moves restored-draft status into parent chrome such as a step header. */
  draftNoticeTarget?: HTMLElement | null;
  /** Emits duel progress so a parent funnel can label its own tab/step. */
  onSelectionProgress?: (selected: number, total: number) => void;
  /** Top 5 slot (1-5) per driver, surfaced on the matching duel card. */
  topFivePositions?: Record<string, number | undefined>;
}

type H2HDraft = {
  selections: Record<string, Id<'drivers'>>;
  updatedAt: string;
};

/** Yield one tick so the final selection renders before its silent backup. */
const AUTO_SAVE_DELAY_MS = 0;

export function H2HPredictionForm({
  raceId,
  matchups,
  sessionType,
  existingPicks,
  onSuccess,
  onDirtyChange,
  analyticsSource,
  entryMethod,
  onSaveIntent,
  renderSaveWall,
  draftNoticeTarget,
  onSelectionProgress,
  topFivePositions,
}: H2HPredictionFormProps) {
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const draftKey = getWebH2HDraftStorageKey(raceId, sessionType);
  const { isAuthenticated } = useConvexAuth();
  const clerkRuntime = useClerkRuntimeControl();
  const autoSubmitFiredRef = useRef(false);
  const firstSelectionCapturedRef = useRef(false);
  const completedCapturedRef = useRef(false);
  const authCompletedCapturedRef = useRef(false);
  const sequenceStartedAtRef = useRef<number | null>(null);

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
  const [persistedSignature, setPersistedSignature] = useState(() =>
    JSON.stringify(existingPicks ?? {}),
  );

  useEffect(() => {
    const draft = loadPredictionDraft<H2HDraft>(draftKey);
    if (draft && Object.keys(draft.selections).length > 0) {
      setSelections(draft.selections);
      setRestoredDraftAt(draft.updatedAt);
    } else {
      setSelections(existingPicks ?? {});
      setRestoredDraftAt(null);
    }
    setPersistedSignature(JSON.stringify(existingPicks ?? {}));
    setHasHydratedDraft(true);
  }, [draftKey, existingPicks]);

  const totalMatchups = matchups.length;
  const selectedCount = Object.keys(selections).length;
  const allSelected = selectedCount === totalMatchups;
  const selectionsSignature = JSON.stringify(selections);
  const isFirstEntry =
    !existingPicks || Object.keys(existingPicks).length === 0;

  // First-time picks save themselves as the last matchup is tapped — users
  // kept completing the grid and forgetting the Save button. Edits stay manual.
  const { markInteraction } = useAutoSaveOnFirstComplete({
    enabled:
      isFirstEntry &&
      // Signed-out players explicitly choose when to save and create an
      // account; completing the grid must never open auth by surprise.
      isAuthenticated &&
      hasHydratedDraft &&
      !autoSubmitFiredRef.current &&
      !hasPendingSubmit(draftKey) &&
      totalMatchups > 0 &&
      !isSubmitting &&
      submitStatus !== 'error',
    complete: allSelected,
    picksSignature: selectionsSignature,
    delayMs: AUTO_SAVE_DELAY_MS,
    save: () => void handleSubmit({ autoSaved: true }),
  });

  function toggleSelection(
    matchupId: Id<'h2hMatchups'>,
    driverId: Id<'drivers'>,
  ) {
    markInteraction();
    const changedPick = selections[matchupId] !== undefined;
    const next = {
      ...selections,
      [matchupId]: driverId,
    };
    const nextCount = Object.keys(next).length;
    const matchupIndex = matchups.findIndex(
      (matchup) => matchup._id === matchupId,
    );
    const matchup = matchups[matchupIndex];

    if (!firstSelectionCapturedRef.current) {
      firstSelectionCapturedRef.current = true;
      sequenceStartedAtRef.current = Date.now();
      captureAnalyticsEvent('h2h_sequence_started', {
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
        matchup_count: totalMatchups,
        source: analyticsSource,
        entry_method: entryMethod,
      });
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent('landing_first_h2h_pick_added', {
          source: analyticsSource,
          race_id: raceId,
          entry_method: entryMethod,
        });
      }
    }

    captureAnalyticsEvent('h2h_duel_selected', {
      race_id: raceId,
      session_type: sessionType ?? 'cascade',
      matchup_position: matchupIndex + 1,
      matchup_count: totalMatchups,
      selected_count: nextCount,
      team: matchup?.team,
      changed_pick: changedPick,
      source: analyticsSource,
      entry_method: entryMethod,
    });

    if (nextCount === totalMatchups && !completedCapturedRef.current) {
      completedCapturedRef.current = true;
      const durationMs = sequenceStartedAtRef.current
        ? Date.now() - sequenceStartedAtRef.current
        : null;
      captureAnalyticsEvent('h2h_sequence_completed', {
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
        matchup_count: totalMatchups,
        duration_ms: durationMs,
        source: analyticsSource,
        entry_method: entryMethod,
      });
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent('landing_h2h_completed', {
          source: analyticsSource,
          race_id: raceId,
          matchup_count: totalMatchups,
          duration_ms: durationMs,
          entry_method: entryMethod,
        });
      }
      if (
        isFirstEntry &&
        import.meta.env.MODE !== 'test' &&
        (typeof window.matchMedia !== 'function' ||
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      ) {
        void import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 48,
            spread: 55,
            origin: { y: 0.68 },
            scalar: 0.8,
          });
        });
      }
    }

    setSelections(next);
    setSubmitStatus('idle');
  }

  async function handleSubmit(options?: {
    autoSaved?: boolean;
    afterSignIn?: boolean;
  }) {
    if (!allSelected || isSubmitting) {
      return;
    }

    const isSilentBackup = Boolean(options?.autoSaved);
    if (!isSilentBackup) {
      setIsSubmitting(true);
      setSubmitStatus('idle');
      setErrorMessage('');
    }

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
        auto_saved: Boolean(options?.autoSaved),
        after_sign_in: Boolean(options?.afterSignIn),
        source: analyticsSource,
      });
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent('landing_prediction_saved', {
          source: analyticsSource,
          prediction_type: 'h2h',
          race_id: raceId,
          session_type: sessionType ?? 'cascade',
          after_sign_in: Boolean(options?.afterSignIn),
        });
      }
      setPersistedSignature(selectionsSignature);
      clearPredictionDraft(draftKey);
      clearPendingSubmit(draftKey);
      setRestoredDraftAt(null);
      setSubmitStatus('success');

      if (!isSilentBackup) {
        void import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        });
        onSuccess?.();
      }
    } catch (error) {
      captureAnalyticsEvent('h2h_prediction_submit_failed', {
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
        is_edit: Boolean(
          existingPicks && Object.keys(existingPicks).length > 0,
        ),
        restored_draft: Boolean(restoredDraftAt),
        matchup_count: totalMatchups,
        source: analyticsSource,
      });
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent('landing_auth_started', {
          source: analyticsSource,
          prediction_type: 'h2h',
          race_id: raceId,
          session_type: sessionType ?? 'cascade',
        });
      }
      if (!isSilentBackup) {
        setSubmitStatus('error');
        setErrorMessage(
          error instanceof Error
            ? toUserFacingMessage(error)
            : 'Failed to submit H2H predictions',
        );
      }
    } finally {
      if (!isSilentBackup) {
        setIsSubmitting(false);
      }
    }
  }

  function requestSubmit() {
    if (!allSelected || isSubmitting) {
      return;
    }
    onSaveIntent?.();
    if (!isAuthenticated) {
      setPendingSubmit(draftKey);
      captureAnalyticsEvent('h2h_prediction_signin_prompted', {
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
        matchup_count: totalMatchups,
      });
      clerkRuntime.requestSignIn();
      return;
    }
    void handleSubmit();
  }

  useEffect(() => {
    if (
      analyticsSource === 'landing' &&
      isAuthenticated &&
      hasPendingSubmit(draftKey) &&
      !authCompletedCapturedRef.current
    ) {
      authCompletedCapturedRef.current = true;
      captureAnalyticsEvent('landing_auth_completed', {
        source: analyticsSource,
        prediction_type: 'h2h',
        race_id: raceId,
        session_type: sessionType ?? 'cascade',
      });
    }
  }, [analyticsSource, draftKey, isAuthenticated, raceId, sessionType]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !hasHydratedDraft ||
      autoSubmitFiredRef.current ||
      !hasPendingSubmit(draftKey) ||
      !allSelected ||
      isSubmitting
    ) {
      return;
    }
    autoSubmitFiredRef.current = true;
    clearPendingSubmit(draftKey);
    void handleSubmit({ afterSignIn: true });
    // The ref guard ensures the pending save fires at most once after auth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasHydratedDraft, draftKey, allSelected, isSubmitting]);

  const hasChanges = selectionsSignature !== persistedSignature;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  useEffect(() => {
    onSelectionProgress?.(selectedCount, totalMatchups);
  }, [onSelectionProgress, selectedCount, totalMatchups]);

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
    allSelected &&
    !hasChanges &&
    ((existingPicks && Object.keys(existingPicks).length === totalMatchups) ||
      (isFirstEntry &&
        persistedSignature === selectionsSignature &&
        persistedSignature !== '{}')),
  );

  const submitButtonProps = {
    variant: 'primary' as const,
    loading: isSubmitting,
    saved: isUnchangedFromSaved,
    disabled: !allSelected || isSubmitting || isUnchangedFromSaved,
    onClick: requestSubmit,
    leftIcon: isUnchangedFromSaved ? Check : Save,
    'data-testid': 'h2h-submit-button',
    children: isUnchangedFromSaved
      ? 'Saved'
      : !isAuthenticated
        ? 'Sign in to save H2H picks'
        : existingPicks && Object.keys(existingPicks).length > 0
          ? 'Save H2H Changes'
          : 'Save H2H Predictions',
  };

  const desktopSubmitButton = (
    <Button {...submitButtonProps} size="md" className="w-100 max-w-full" />
  );

  const mobileSubmitButton = (
    <Button {...submitButtonProps} size="sm" className="w-full" />
  );
  const showCustomSaveWall = Boolean(
    !isAuthenticated && allSelected && renderSaveWall,
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
    clearPendingSubmit(draftKey);
  }

  return (
    <>
      {restoredDraftAt ? (
        <DraftRestoredNotice
          target={draftNoticeTarget}
          onDiscard={handleDiscardDraft}
        />
      ) : null}
      {/* One duel at a time is the right way to *make* eleven calls and the
          wrong way to *check* them. The moment the last one lands, the whole
          grid replaces the sequence so the card can be read and edited in one
          go, which is also what the save wall underneath is asking about. */}
      {isFirstEntry && !allSelected ? (
        <H2HDuelPicker
          matchups={matchups}
          selections={selections}
          onSelect={toggleSelection}
          draftHydrated={hasHydratedDraft}
          topFivePositions={topFivePositions}
        />
      ) : (
        <>
          {isFirstEntry ? (
            <p className="gpp-label mb-3 flex items-center gap-1.5 text-text-muted">
              <Check size={14} className="text-accent" aria-hidden="true" />
              All eleven called.
              <br />
              Tap any driver to change your mind.
            </p>
          ) : null}
          <H2HMatchupGrid
            matchups={matchups}
            selections={selections}
            mode="interactive"
            onSelect={toggleSelection}
            actionCard={
              isFirstEntry ? undefined : (
                <div className="hidden items-stretch sm:flex">
                  <div className="flex w-full items-center justify-center p-3">
                    {desktopSubmitButton}
                  </div>
                </div>
              )
            }
          />
        </>
      )}

      {showCustomSaveWall ? renderSaveWall?.({ lockIn: requestSubmit }) : null}

      {/* The sequential picker owns progress during first entry. Its save row
          appears only after the final duel; overview edits retain the sticky
          mobile progress/save bar used by the longer matchup grid. */}
      {!showCustomSaveWall && (!isFirstEntry || allSelected) ? (
        <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-page px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:static sm:z-auto sm:mx-0 sm:border-t-0 sm:bg-transparent sm:p-0 sm:pb-0">
          <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3">
            <span className="min-h-5 text-center text-sm text-text-muted sm:w-auto">
              {allSelected
                ? 'All matchups selected'
                : `${totalMatchups - selectedCount} matchup${
                    totalMatchups - selectedCount !== 1 ? 's' : ''
                  } remaining`}
            </span>

            <>
              <div className="sm:hidden">{mobileSubmitButton}</div>
              {isFirstEntry ? (
                <div className="hidden sm:block">{desktopSubmitButton}</div>
              ) : null}
            </>

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
      ) : null}
    </>
  );
}
