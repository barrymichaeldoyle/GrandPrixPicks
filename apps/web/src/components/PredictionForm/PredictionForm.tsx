import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { isSyntheticRaceSlug } from '@grandprixpicks/shared/syntheticRaces';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';
import { useBlocker } from '@tanstack/react-router';
import { useConvexAuth, useMutation } from 'convex/react';
import { useQuery } from '@/integrations/convex/query';
import type { ReactNode } from 'react';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useAutoSaveOnFirstComplete } from '@/hooks/useAutoSaveOnFirstComplete';
import { useClerkRuntimeControl } from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  analyticsEvents,
  analyticsFailureReason,
} from '@grandprixpicks/shared/analytics';
import {
  clearPendingSubmit,
  clearPredictionDraft,
  hasPendingSubmit,
  setPendingSubmit,
} from '@/lib/predictionDrafts';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { getRaceSessionLockAt } from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';
import { pickPool, resolvePicks } from '@/lib/roster';
import { ConfirmDialog } from '../ConfirmDialog';
import { DraftRestoredNotice } from '../DraftRestoredNotice';
import { InlineLoader } from '../InlineLoader';
import { PicksSaveStatus } from '../PicksSaveStatus';
import {
  DRIVER_POOL_DROPPABLE_ID,
  emptySlotId,
  parseEmptySlotId,
} from './dndIds';
import { DriverPoolSection } from './DriverPool';
import { EmptySlotDroppable, SortablePickRow } from './PickRows';
import { PicksListHeader } from './PicksListHeader';
import { SubmitRow } from './SubmitRow';
import { useDriverSlotTooltip } from './useDriverSlotTooltip';
import { useTop5Draft } from './useTop5Draft';

interface PredictionFormProps {
  raceId: Id<'races'>;
  /** Server-rendered driver seed used until the live Convex query resolves. */
  initialDrivers?: Doc<'drivers'>[];
  existingPicks?: Id<'drivers'>[];
  /** Unsaved picks retained in memory across an auth-provider remount. */
  initialDraftPicks?: Id<'drivers'>[];
  /** Do not announce a same-page provider remount as a restored visit. */
  suppressDraftRestoredNotice?: boolean;
  /** If provided, only update this specific session. Otherwise cascade to all. */
  sessionType?: SessionType;
  /**
   * Called after a successful submit. The argument says what kind of save it
   * was, because a parent must never treat a background auto-save of an edit as
   * a user action: closing an overlay out from under someone who is still
   * reordering their picks is the UI moving on its own.
   */
  onSuccess?: (save: { autoSaved: boolean; wasFirstSave: boolean }) => void;
  /** Emits whether the form currently has unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Disable route navigation blocking in environments like Storybook. */
  enableNavigationBlocker?: boolean;
  /** Optional product-shaped placeholder while driver data loads. */
  loadingFallback?: ReactNode;
  /**
   * Replaces the submit row for a signed-out visitor once all five slots are
   * filled, so the landing page can put its own save-wall copy there. `lockIn`
   * runs the normal submit path: it opens sign-in and the draft submits itself
   * the moment auth lands.
   */
  renderSaveWall?: (actions: { lockIn: () => void }) => ReactNode;
  /**
   * Replaces the entire submit area for a guided parent flow. Unlike the
   * signed-out save wall, this renders regardless of auth state and lets the
   * parent defer saving until a later step.
   *
   * `saveNow` exists for exit buttons: the auto-save of an edit is debounced,
   * so a parent that unmounts this form within that window (closing an overlay)
   * would cancel the pending write. Await it before closing.
   */
  renderActionArea?: (state: {
    complete: boolean;
    saveState: SaveState;
    saveNow: () => Promise<void>;
    /**
     * The real submit, including the signed-out path: it parks the draft and
     * opens sign-in, where `saveNow` only flushes a debounced write for an
     * already-authenticated player. A funnel that offers its own save button
     * needs this one.
     */
    submit: () => void;
  }) => ReactNode;
  /** Moves restored-draft status into parent chrome such as a step header. */
  draftNoticeTarget?: HTMLElement | null;
  /** Adds conversion-funnel properties/events without changing app forms. */
  analyticsSource?: 'landing' | 'writeup' | 'predictions_hub';
  /** On narrow screens, put the actionable driver pool before the review list. */
  mobileActionFirst?: boolean;
  /** Parent chrome already names the Top 5, so omit the repeated list heading. */
  hidePicksHeading?: boolean;
  /** Show the auto-save receipt above the picks instead of in the action row. */
  inlineSaveStatus?: boolean;
  /** Called once when this mounted form first reaches five picks. */
  onComplete?: () => void;
  /** Keeps a parent funnel aware of restored and subsequently edited drafts. */
  onCompletionStateChange?: (complete: boolean) => void;
  /** Emits the current picks in order, so a parent can cross-reference them. */
  onPicksChange?: (picks: Id<'drivers'>[]) => void;
  /**
   * Takes over "Start over" for a parent that owns more than this form's draft
   * (the landing card resets both prediction steps, not just the Top 5).
   */
  onStartOver?: () => void;
}

/**
 * What the form would tell you about the server if you asked right now. Auto-
 * save is silent, and silence is only trustworthy when there is somewhere to
 * look: without this, "Done" reads as "discard".
 */
export type SaveState = 'unsaved' | 'saving' | 'saved' | 'error';

/**
 * Grace period after the 5th pick lands before auto-saving. Longer than the
 * H2H delay because pick order matters here — reordering resets the timer.
 */
/** Completing the set saves it. See `useAutoSaveOnFirstComplete`. */
const FIRST_SAVE_DELAY_MS = 0;
/** Long enough that a drag-reorder writes once, short enough to feel saved. */
const EDIT_SAVE_DEBOUNCE_MS = 1200;

export function PredictionForm({
  raceId,
  initialDrivers,
  existingPicks,
  initialDraftPicks,
  suppressDraftRestoredNotice = false,
  sessionType,
  onSuccess,
  onDirtyChange,
  enableNavigationBlocker = true,
  loadingFallback,
  renderSaveWall,
  renderActionArea,
  draftNoticeTarget,
  analyticsSource,
  mobileActionFirst = false,
  hidePicksHeading = false,
  inlineSaveStatus = false,
  onComplete,
  onCompletionStateChange,
  onPicksChange,
  onStartOver,
}: PredictionFormProps) {
  const race = useQuery(api.races.getRace, { raceId });
  // Pinned to this race's round once it resolves, so the pool is the grid that
  // races here. Until then `initialDrivers` covers the gap; for the next race
  // the round-less default is the same answer anyway.
  const liveDrivers = useQuery(
    api.drivers.listDrivers,
    race
      ? { round: race.round, season: race.season, includeNotRacing: true }
      : { includeNotRacing: true },
  );
  const drivers = liveDrivers ?? initialDrivers;
  const nextPredictionRace = useQuery(api.races.getNextRace, {});
  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const draftKey = getWebTop5DraftStorageKey(raceId, sessionType);
  // Convex-level auth (not just Clerk's isSignedIn): a signed-out visitor can
  // build a full set of picks, and we only submit once Convex has the identity
  // — waiting on this avoids the token-propagation race right after sign-in.
  const { isAuthenticated } = useConvexAuth();
  const clerkRuntime = useClerkRuntimeControl();
  const autoSubmitFiredRef = useRef(false);
  const authCompletedCapturedRef = useRef(false);
  const saveWallCapturedRef = useRef(false);
  const firstPickCapturedRef = useRef(false);
  const topFiveCapturedRef = useRef(false);
  const yourPicksRef = useRef<HTMLDivElement>(null);

  const {
    picks,
    setPicks,
    restoredDraftAt,
    setRestoredDraftAt,
    hasHydratedDraft,
    hasChanges,
  } = useTop5Draft({
    draftKey,
    existingPicks,
    initialDraftPicks,
    suppressDraftRestoredNotice,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const now = useNow();
  // Effect Events read current callbacks without retriggering notifications.
  const reportCompletionState = useEffectEvent((complete: boolean) =>
    onCompletionStateChange?.(complete),
  );
  const reportPicksChange = useEffectEvent((next: Id<'drivers'>[]) =>
    onPicksChange?.(next),
  );

  function analyticsProperties() {
    return {
      source: analyticsSource,
      race_id: raceId,
      race_slug: race?.slug,
      session_type: sessionType ?? 'cascade',
    };
  }

  function trackPickProgress(nextCount: number) {
    if (
      analyticsSource === 'landing' &&
      nextCount >= 1 &&
      !firstPickCapturedRef.current
    ) {
      firstPickCapturedRef.current = true;
      captureAnalyticsEvent('landing_first_pick_added', analyticsProperties());
    }
    if (nextCount !== 5) {
      return;
    }

    if (!topFiveCapturedRef.current) {
      topFiveCapturedRef.current = true;
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent(
          'landing_top_five_completed',
          analyticsProperties(),
        );
      }
      onComplete?.();
    }

    // Completion analytics is one-shot, but this affordance is not. If the
    // player removes a pick and fills P5 again, the pool is above the list and
    // the completed order is off-screen again.
    if (
      mobileActionFirst &&
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      window.requestAnimationFrame(() => {
        yourPicksRef.current?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'auto'
            : 'smooth',
          block: 'start',
        });
      });
    }
  }

  useLayoutEffect(() => {
    if (hasHydratedDraft) {
      reportCompletionState(picks.length === 5);
    }
  }, [hasHydratedDraft, picks.length]);

  useLayoutEffect(() => {
    if (hasHydratedDraft) {
      reportPicksChange(picks);
    }
  }, [hasHydratedDraft, picks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const overId = String(over.id);
    const activeId = String(active.id) as Id<'drivers'>;
    const inPicks = picks.includes(activeId);

    if (overId === DRIVER_POOL_DROPPABLE_ID) {
      if (inPicks) {
        removeDriver(activeId);
      }
      return;
    }
    const emptySlot = parseEmptySlotId(overId);
    if (emptySlot !== null) {
      if (!inPicks && picks.length < 5) {
        addDriverAtPosition(activeId, Math.min(emptySlot, 5));
      }
      return;
    }
    // over is a pick id (sortable item)
    const overDriverId = overId as Id<'drivers'>;
    if (inPicks) {
      const oldIndex = picks.indexOf(activeId);
      const newIndex = picks.indexOf(overDriverId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        markInteraction();
        setPicks(arrayMove(picks, oldIndex, newIndex));
      }
    } else if (picks.length < 5) {
      const insertIndex = picks.indexOf(overDriverId);
      if (insertIndex !== -1) {
        addDriverAtPosition(activeId, insertIndex);
      }
    }
    setSubmitStatus('idle');
  }

  const driverSlotTooltip = useDriverSlotTooltip(mobileActionFirst);

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  const blocker = useBlocker({
    shouldBlockFn: () => hasChanges,
    enableBeforeUnload: true,
    withResolver: true,
    disabled: !enableNavigationBlocker || !hasChanges,
  });

  // Cascade mode (no sessionType) saves until the last session locks. The
  // helper returns 0 for sessions with no lock time — treat that as unknown
  // (not locked) rather than locked-since-epoch.
  const sessionLockAt = race
    ? getRaceSessionLockAt(race, sessionType ?? 'race') || undefined
    : undefined;
  // A scenario fixture is never the next calendar race but takes picks when
  // opened on purpose, as the backend allows (`isRaceAcceptingPredictions`).
  const isRaceCurrentlyOpen =
    nextPredictionRace?._id === raceId ||
    (race !== undefined && race !== null && isSyntheticRaceSlug(race.slug));
  const isSessionCurrentlyLocked =
    sessionType !== undefined &&
    sessionLockAt !== undefined &&
    now >= sessionLockAt;
  const submissionBlockedMessage = isSessionCurrentlyLocked
    ? 'This session is already locked. You can still view your picks, but you can’t save changes now.'
    : nextPredictionRace !== undefined && !isRaceCurrentlyOpen
      ? 'Predictions are closed for this race right now. Open the current prediction race instead.'
      : null;
  const isSubmissionBlocked = submissionBlockedMessage !== null;

  // Completing the set *is* the save: the 5th driver lands, the celebration
  // fires and the write goes out together, so there is no window in which the
  // player believes they are done but nothing is stored. Edits afterwards are
  // debounced rather than immediate, so dragging a driver up the order writes
  // once when they stop rather than once per frame.
  //
  // `dirty` is what keeps that affordable: it is false whenever the picks
  // already match the server, so a remount, a reorder that lands back where it
  // started, or simply re-opening the card never writes at all.
  const savedSignature = JSON.stringify(existingPicks ?? []);
  const picksSignature = JSON.stringify(picks);
  const { markInteraction, pending: autoSavePending } =
    useAutoSaveOnFirstComplete({
      enabled:
        // Signed-out users drive the save explicitly (which opens sign-in); we
        // never want the auto-save timer to pop a modal on its own.
        isAuthenticated &&
        hasHydratedDraft &&
        !autoSubmitFiredRef.current &&
        !hasPendingSubmit(draftKey) &&
        !isSubmitting &&
        !isSubmissionBlocked &&
        // A failed save falls back to the manual button rather than retrying on
        // a loop the player cannot see or stop.
        submitStatus !== 'error',
      complete: picks.length === 5,
      dirty: picksSignature !== savedSignature,
      picksSignature,
      delayMs: FIRST_SAVE_DELAY_MS,
      subsequentDelayMs: EDIT_SAVE_DEBOUNCE_MS,
      save: () => void handleSubmit({ autoSaved: true }),
    });

  const availableDrivers = drivers ?? [];
  // Every saved pick resolves, including a driver who has since lost their
  // seat. Dropping one would render four slots for five saved picks and, worse,
  // leave the form believing it was already complete.
  const pickedDrivers = resolvePicks(picks, availableDrivers);

  // listDrivers already returns championship order, computed from this
  // season's results. Re-sorting here on last season's static list would
  // quietly undo that, so the pool takes the order it is given. The fallback
  // still covers the pre-seeded `initialDrivers` a route can hand in.
  // The pool is the racing subset: the query is asked for everyone so saved
  // picks resolve, so this filter is what keeps a driver who is out of a car
  // from being offered again.
  const driversSortedByTeam = pickPool(availableDrivers);

  function addDriver(driverId: Id<'drivers'>) {
    if (picks.length >= 5) {
      return;
    }
    if (picks.includes(driverId)) {
      return;
    }
    markInteraction();
    setPicks([...picks, driverId]);
    trackPickProgress(picks.length + 1);
    setSubmitStatus('idle');
  }

  function removeDriver(driverId: Id<'drivers'>) {
    markInteraction();
    setPicks(picks.filter((id) => id !== driverId));
    setSubmitStatus('idle');
  }

  /**
   * Where keyboard focus goes after a Remove button takes its own row away.
   * Left alone it fell to `<body>`, which in the overlay means outside the
   * dialog: a keyboard player removing two picks had to tab back in from the
   * top. It lands on the Remove button now in the same position, else the one
   * above, else the first driver they can pick.
   */
  const focusAfterRemoveRef = useRef<number | null>(null);
  function removeDriverFromRow(driverId: Id<'drivers'>) {
    focusAfterRemoveRef.current = picks.indexOf(driverId);
    removeDriver(driverId);
  }
  useEffect(() => {
    const index = focusAfterRemoveRef.current;
    if (index === null) {
      return;
    }
    focusAfterRemoveRef.current = null;
    const scope = yourPicksRef.current?.parentElement;
    const target =
      scope?.querySelector<HTMLElement>(
        `[data-testid="remove-pick-${index + 1}"]`,
      ) ??
      scope?.querySelector<HTMLElement>(
        `[data-testid="remove-pick-${index}"]`,
      ) ??
      scope?.querySelector<HTMLElement>(
        '[data-testid^="driver-"]:not(:disabled)',
      );
    target?.focus();
  }, [picks]);

  /** Insert driver at slot index (0–4). Used when dropping from pool onto a row. */
  function addDriverAtPosition(driverId: Id<'drivers'>, slotIndex: number) {
    markInteraction();
    const without = picks.filter((id) => id !== driverId);
    const next = [...without];
    next.splice(slotIndex, 0, driverId);
    const nextPicks = next.slice(0, 5);
    setPicks(nextPicks);
    trackPickProgress(nextPicks.length);
    setSubmitStatus('idle');
  }

  function moveUp(index: number) {
    if (index === 0) {
      return;
    }
    markInteraction();
    const newPicks = [...picks];
    [newPicks[index - 1], newPicks[index]] = [
      newPicks[index],
      newPicks[index - 1],
    ];
    setPicks(newPicks);
    setSubmitStatus('idle');
  }

  function moveDown(index: number) {
    if (index >= picks.length - 1) {
      return;
    }
    markInteraction();
    const newPicks = [...picks];
    [newPicks[index], newPicks[index + 1]] = [
      newPicks[index + 1],
      newPicks[index],
    ];
    setPicks(newPicks);
    setSubmitStatus('idle');
  }

  async function handleSubmit(options?: {
    autoSaved?: boolean;
    afterSignIn?: boolean;
  }) {
    if (picks.length !== 5 || isSubmitting) {
      return;
    }

    const wasFirstSave = !existingPicks || existingPicks.length === 0;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await submitPrediction({ raceId, picks, sessionType });
      captureAnalyticsEvent(analyticsEvents.predictionSaved, {
        prediction_type: 'top5',
        scope: sessionType ? 'session' : 'cascade',
        race_id: raceId,
        race_slug: race?.slug,
        session_type: sessionType ?? 'cascade',
        is_edit: Boolean(existingPicks && existingPicks.length > 0),
        restored_draft: Boolean(restoredDraftAt),
        auto_saved: Boolean(options?.autoSaved),
        after_sign_in: Boolean(options?.afterSignIn),
        source: analyticsSource,
      });
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent('landing_prediction_saved', {
          ...analyticsProperties(),
          after_sign_in: Boolean(options?.afterSignIn),
        });
      }
      setSubmitStatus('success');
      // The celebration marks "your picks are in", so it belongs to the save
      // that first puts them there rather than to every later adjustment.
      if (wasFirstSave) {
        // Celebration is not part of the critical picker bundle.
        void import('canvas-confetti').then(({ default: confetti }) => {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        });
      }
      clearPredictionDraft(draftKey);
      clearPendingSubmit(draftKey);
      setRestoredDraftAt(null);
      onSuccess?.({
        autoSaved: Boolean(options?.autoSaved),
        wasFirstSave,
      });
    } catch (error) {
      captureAnalyticsEvent(analyticsEvents.predictionSaveFailed, {
        prediction_type: 'top5',
        scope: sessionType ? 'session' : 'cascade',
        reason: analyticsFailureReason(error),
        race_id: raceId,
        race_slug: race?.slug,
        session_type: sessionType ?? 'cascade',
        is_edit: Boolean(existingPicks && existingPicks.length > 0),
      });
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? toUserFacingMessage(error, 'Your Top 5 wasn’t saved. Try again.')
          : 'Your Top 5 wasn’t saved. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Try-before-signup: a signed-out visitor can build their picks (kept as a
  // device draft), then hit save. Instead of the auth-gated mutation, prompt
  // sign-in; the draft auto-submits once Convex auth lands (see the effect
  // below), so their picks are saved the moment they finish signing up.
  function requestSubmit(options?: { autoSaved?: boolean }) {
    if (picks.length !== 5 || isSubmitting || isSubmissionBlocked) {
      return;
    }
    if (!isAuthenticated) {
      setPendingSubmit(draftKey, analyticsSource);
      captureAnalyticsEvent('prediction_signin_prompted', {
        race_id: raceId,
        race_slug: race?.slug,
        session_type: sessionType ?? 'cascade',
        source: analyticsSource,
      });
      if (analyticsSource === 'landing') {
        captureAnalyticsEvent('landing_auth_started', analyticsProperties());
      }
      clerkRuntime.requestSignIn();
      return;
    }
    void handleSubmit(options);
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
        race_id: raceId,
        race_slug: race?.slug,
        session_type: sessionType ?? 'cascade',
      });
    }
  }, [
    analyticsSource,
    draftKey,
    isAuthenticated,
    race?.slug,
    raceId,
    sessionType,
  ]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !hasHydratedDraft ||
      autoSubmitFiredRef.current ||
      !hasPendingSubmit(draftKey) ||
      picks.length !== 5 ||
      isSubmitting ||
      isSubmissionBlocked
    ) {
      return;
    }
    autoSubmitFiredRef.current = true;
    clearPendingSubmit(draftKey);
    void handleSubmit({ afterSignIn: true });
    // handleSubmit is a stable closure recreated each render; the ref guard
    // ensures this fires at most once regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    hasHydratedDraft,
    draftKey,
    picks,
    isSubmitting,
    isSubmissionBlocked,
  ]);

  /**
   * The save-wall only replaces the submit row for a signed-out visitor with a
   * complete grid. Once they authenticate the pending draft submits itself, so
   * the ordinary submit row has to be back by then to report the result.
   */
  const showSaveWall = Boolean(
    renderSaveWall && !isAuthenticated && picks.length === 5,
  );

  useEffect(() => {
    if (
      analyticsSource !== 'landing' ||
      !showSaveWall ||
      saveWallCapturedRef.current
    ) {
      return;
    }
    saveWallCapturedRef.current = true;
    captureAnalyticsEvent(
      onComplete
        ? 'landing_top_five_handoff_viewed'
        : 'landing_save_wall_viewed',
      {
        source: analyticsSource,
        race_id: raceId,
        race_slug: race?.slug,
        session_type: sessionType ?? 'cascade',
      },
    );
  }, [
    analyticsSource,
    onComplete,
    race?.slug,
    raceId,
    sessionType,
    showSaveWall,
  ]);

  if (drivers === undefined) {
    return loadingFallback ?? <InlineLoader />;
  }

  /** When editing existing picks: current selection matches saved → show Saved, disable button */
  const isUnchangedFromSaved = Boolean(
    existingPicks?.length === 5 && picks.length === 5 && !hasChanges,
  );

  const saveState: SaveState = isSubmitting
    ? 'saving'
    : submitStatus === 'error'
      ? 'error'
      : hasChanges
        ? 'unsaved'
        : 'saved';

  // Completing the set writes itself. Lighting up the big save button for
  // that beat is what used to flash under the player's thumb while the
  // request was already in flight — keep the control quiet and let the
  // receipt (or a parent action row) do the talking. A failed write puts
  // the button back so they can retry.
  const isFirstEntry = !existingPicks || existingPicks.length === 0;
  const suppressManualSave =
    isAuthenticated &&
    isFirstEntry &&
    picks.length === 5 &&
    submitStatus !== 'error' &&
    (autoSavePending || isSubmitting);

  /**
   * Write whatever is on screen, right now, and resolve when it has landed.
   *
   * The exit button of an overlay calls this before closing. Auto-saving an
   * edit is debounced by `EDIT_SAVE_DEBOUNCE_MS`, and unmounting the form
   * cancels that timer, so a player who reorders and immediately leaves would
   * otherwise take their change with them.
   */
  async function saveNow() {
    if (!hasChanges || picks.length !== 5 || isSubmissionBlocked) {
      return;
    }
    await handleSubmit();
  }

  function handleDiscardDraft() {
    captureAnalyticsEvent('prediction_draft_discarded', {
      race_id: raceId,
      race_slug: race?.slug,
      session_type: sessionType ?? 'cascade',
    });
    setPicks(existingPicks ?? []);
    setSubmitStatus('idle');
    setErrorMessage('');
    setRestoredDraftAt(null);
    clearPredictionDraft(draftKey);
    // The parent may own a wider reset (and may remount this form to do it),
    // so this runs after the local clear rather than instead of it.
    onStartOver?.();
  }

  // Empty slots needed
  const emptySlots = 5 - pickedDrivers.length;

  // One node, rendered either beside the driver-pool label or portalled into
  // the parent's step heading. No parentheses: wherever it lands it is a line
  // of its own, and bracketed text there reads as a fragment.
  // This status leads the compact instruction row when parent chrome already
  // names the Top 5, and supports the local heading on standalone forms.
  const pickStatusClassName = 'text-sm font-normal text-text-muted';
  // `withTestIds` is off for the copy beside "Select Drivers": only one of the
  // two is ever displayed, but both are in the DOM, and tests find one.
  //
  // One node whose text changes, rather than two that swap, so the live region
  // survives the change and a screen reader hears each pick land ("2 left").
  // Only the displayed copy is in the accessibility tree, so only it speaks.
  function renderPickStatus(withTestIds: boolean) {
    return (
      <span
        className={pickStatusClassName}
        aria-live="polite"
        data-testid={
          withTestIds && picks.length < 5 ? 'picks-remaining' : undefined
        }
      >
        {picks.length >= 5
          ? 'Remove a pick to change'
          : `${5 - picks.length} left`}
      </span>
    );
  }
  const pickStatus = renderPickStatus(true);

  /**
   * The auto-save receipt, in the layout from the first pick rather than
   * mounted by the fifth. Mounting it then pushed the row (and wrapped it on a
   * phone) the moment the set completed; now it only turns visible.
   */
  function renderInlineSaveStatus(withTestIds: boolean) {
    return inlineSaveStatus ? (
      <div
        className={`shrink-0 ${picks.length === 5 ? '' : 'invisible'}`}
        aria-hidden={picks.length !== 5}
      >
        <PicksSaveStatus
          state={picks.length === 5 ? saveState : 'saved'}
          testId={withTestIds ? undefined : null}
        />
      </div>
    ) : null;
  }

  return (
    <DndContext
      id={`top-five-${raceId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="@container space-y-4 sm:space-y-6">
        {restoredDraftAt ? (
          <DraftRestoredNotice
            target={draftNoticeTarget}
            onDiscard={handleDiscardDraft}
          />
        ) : null}
        {/* Side-by-side only when *this* form is wide enough. Viewport `lg`
            alone is wrong inside the dashboard's narrow center column. */}
        <div className="flex flex-col gap-4 sm:gap-6 @min-[875px]:flex-row @min-[875px]:items-start @min-[875px]:gap-8">
          {/* Your Picks - sortable list via @dnd-kit */}
          <div
            ref={yourPicksRef}
            data-testid="your-picks"
            className={`${mobileActionFirst ? 'order-2 scroll-mt-28 @min-[875px]:order-1' : ''} @min-[875px]:w-[min(100%,380px)] @min-[875px]:min-w-0 @min-[875px]:shrink-0 ${hidePicksHeading ? '@min-[875px]:pt-10' : ''}`}
          >
            <PicksListHeader
              hidePicksHeading={hidePicksHeading}
              pickCount={picks.length}
              pickStatus={pickStatus}
              inlineSaveStatus={renderInlineSaveStatus(true)}
            />
            <div
              className="flex overflow-hidden rounded-xl border border-border bg-surface"
              data-testid="picks-list"
            >
              {/* Timing-tower position labels: "P1" reads as a broadcast
                  position, a bare "1" reads as a list bullet. */}
              <div className="flex shrink-0 flex-col border-r border-border bg-surface-muted/50">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="gpp-mono flex h-14 w-10 shrink-0 items-center justify-center border-b border-border text-sm font-semibold text-accent last:border-b-0 sm:h-16 sm:w-12"
                    aria-hidden
                  >
                    P{n}
                  </div>
                ))}
              </div>

              <SortableContext
                items={picks}
                strategy={verticalListSortingStrategy}
              >
                <div
                  role="group"
                  aria-label="Your Top 5"
                  className="flex min-w-0 flex-1 flex-col"
                >
                  {picks.map((driverId, index) => {
                    const driver = drivers.find((d) => d._id === driverId);
                    if (!driver) {
                      return null;
                    }
                    return (
                      <SortablePickRow
                        key={driverId}
                        driverId={driverId}
                        driver={driver}
                        index={index}
                        picksLength={picks.length}
                        moveUp={moveUp}
                        moveDown={moveDown}
                        removeDriver={removeDriverFromRow}
                      />
                    );
                  })}
                  {Array.from({ length: emptySlots }).map((_, i) => {
                    const slotIndex = picks.length + i;
                    return (
                      <EmptySlotDroppable
                        key={emptySlotId(slotIndex)}
                        slotIndex={slotIndex}
                        driverSlotTooltip={driverSlotTooltip}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </div>

            {/* Guided funnels can own this area completely so progressing to
                the next step never competes with an early save action. */}
            {renderActionArea ? (
              renderActionArea({
                complete: picks.length === 5,
                saveState,
                saveNow,
                submit: () => requestSubmit(),
              })
            ) : showSaveWall && renderSaveWall ? (
              renderSaveWall({ lockIn: () => requestSubmit() })
            ) : (
              <SubmitRow
                showSaving={isSubmitting && !suppressManualSave}
                saved={isUnchangedFromSaved}
                picksLeft={Math.max(0, 5 - picks.length)}
                disabled={
                  picks.length !== 5 ||
                  isSubmitting ||
                  isUnchangedFromSaved ||
                  isSubmissionBlocked ||
                  suppressManualSave
                }
                isAuthenticated={isAuthenticated}
                isEdit={Boolean(existingPicks && existingPicks.length > 0)}
                showSuccess={submitStatus === 'success' && !suppressManualSave}
                errorMessage={submitStatus === 'error' ? errorMessage : null}
                onSubmit={() => requestSubmit()}
              />
            )}
            {submissionBlockedMessage ? (
              <p className="mt-2 text-center text-sm text-warning">
                {submissionBlockedMessage}
              </p>
            ) : null}
            {showSaveWall || renderActionArea ? null : (
              <p className="mt-2 text-center text-xs text-text-muted">
                You can edit your picks any time before this session starts.
              </p>
            )}
          </div>

          <DriverPoolSection
            drivers={driversSortedByTeam}
            picks={picks}
            mobileActionFirst={mobileActionFirst}
            pickStatus={
              hidePicksHeading ? (
                <>
                  {renderPickStatus(false)}
                  {renderInlineSaveStatus(false)}
                </>
              ) : null
            }
            onAddDriver={addDriver}
          />
        </div>
      </div>
      {enableNavigationBlocker && blocker.status === 'blocked' && (
        <ConfirmDialog
          open
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
          title="Leave without saving?"
          description="You have unsaved picks. We'll keep them as a draft on this device, but they won't count until you save them."
          confirmLabel="Leave Page"
        />
      )}
    </DndContext>
  );
}
