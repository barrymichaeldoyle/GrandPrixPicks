import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';
import { teamStandingsIndex } from '@grandprixpicks/shared/teams';
import { useBlocker } from '@tanstack/react-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { m } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useAutoSaveOnFirstComplete } from '@/hooks/useAutoSaveOnFirstComplete';
import { useCallbackRef } from '@/hooks/useCallbackRef';
import { useClerkRuntimeControl } from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { displayTeamName } from '@/lib/display';
import {
  clearPendingSubmit,
  clearPredictionDraft,
  hasPendingSubmit,
  loadPredictionDraft,
  savePredictionDraft,
  setPendingSubmit,
} from '@/lib/predictionDrafts';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { getRaceSessionLockAt } from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect';
import { Button } from './Button/Button';
import { ConfirmDialog } from './ConfirmDialog';
import { DraftRestoredNotice } from './DraftRestoredNotice';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import { Flag } from './Flag';
import { InlineLoader } from './InlineLoader';
import { Tooltip } from './Tooltip';

const DRIVER_SLOT_TOOLTIP = {
  /** Default stack: picks first, driver pool underneath. */
  narrowBelow: 'Select from the driver cards below',
  /** Landing `mobileActionFirst`: driver pool first, picks underneath. */
  narrowAbove: 'Select from the driver cards above',
  lg: 'Select from the driver cards to the right',
};

function driverSlotTooltipCopy({
  wide,
  driversAbove,
}: {
  wide: boolean;
  driversAbove: boolean;
}) {
  if (wide) {
    return DRIVER_SLOT_TOOLTIP.lg;
  }
  return driversAbove
    ? DRIVER_SLOT_TOOLTIP.narrowAbove
    : DRIVER_SLOT_TOOLTIP.narrowBelow;
}

const DRIVER_POOL_DROPPABLE_ID = 'driver-pool';

function emptySlotId(slotIndex: number) {
  return `empty-${slotIndex}`;
}

function parseEmptySlotId(id: string): number | null {
  if (!id.startsWith('empty-')) {
    return null;
  }
  const n = parseInt(id.slice(6), 10);
  return Number.isNaN(n) ? null : n;
}

type Driver = Doc<'drivers'>;

/** Left-side badge (number + code) – reused so it can be wrapped as drag handle on mobile. */
function DriverPickBadge({ driver }: { driver: Driver }) {
  return (
    // The team colour is the 3px edge bar on this block, not its fill. The
    // number and code are data, so they are mono and tabular.
    <div
      className="gpp-team-bar flex h-full w-12 shrink-0 items-center justify-center border-r border-border py-1 pl-1 sm:w-14"
      style={
        {
          '--team-colour':
            (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
        } as React.CSSProperties
      }
    >
      <span className="inline-flex flex-col items-center gap-0.5 leading-none">
        {driver.number != null && (
          <span className="gpp-mono text-sm text-text sm:text-base">
            {driver.number}
          </span>
        )}
        <span className="gpp-mono text-xs text-text-muted">{driver.code}</span>
      </span>
    </div>
  );
}

/** Sortable pick row using @dnd-kit – whole card draggable, works on touch and desktop. */
function SortablePickRow({
  driverId,
  driver,
  index,
  picksLength,
  moveUp,
  moveDown,
  removeDriver,
}: {
  driverId: Id<'drivers'>;
  driver: Driver;
  index: number;
  picksLength: number;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  removeDriver: (id: Id<'drivers'>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: driverId });
  const position = index + 1;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <m.div
      ref={setNodeRef}
      style={style}
      layout={!isDragging}
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 30 },
      }}
      data-testid={`picked-driver-${position}`}
      className={`relative flex h-14 shrink-0 items-stretch gap-0 border-b border-transparent bg-surface-muted sm:h-16 ${isDragging ? 'z-10 opacity-60' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex min-w-0 flex-1 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        aria-label="Drag to reorder"
      >
        <DriverPickBadge driver={driver} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0 px-2 py-1.5 sm:px-3 sm:py-2">
          <div className="flex items-center gap-2">
            {driver.nationality && (
              <Flag code={driver.nationality} size="xs" className="shrink-0" />
            )}
            <span className="truncate font-medium text-text">
              {driver.displayName}
            </span>
          </div>
          {driver.team && (
            <span
              className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted"
              style={
                {
                  '--team-colour':
                    TEAM_COLORS[driver.team] || FALLBACK_TEAM_COLOR,
                } as CSSProperties
              }
            >
              <span className="gpp-team-dot" aria-hidden />
              <span className="truncate">{displayTeamName(driver.team)}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 border-l border-border/50 py-1 pr-1 pl-1.5 sm:pl-2">
        <div className="flex flex-col bg-surface-muted/50">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveUp(index);
            }}
            disabled={index === 0}
            className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-accent-muted/40 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp size={14} className="text-accent" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveDown(index);
            }}
            disabled={index >= picksLength - 1}
            className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-accent-muted/40 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown size={14} className="text-accent" />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeDriver(driver._id);
          }}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-error-muted focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          aria-label="Remove"
          data-testid={`remove-pick-${position}`}
        >
          <X size={16} className="text-error" />
        </button>
      </div>
    </m.div>
  );
}

/** Empty slot that accepts drops from the driver pool (and tap to set insert-at position). */
function EmptySlotDroppable({
  slotIndex,
  driverSlotTooltip,
}: {
  slotIndex: number;
  driverSlotTooltip: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: emptySlotId(slotIndex) });
  return (
    <Tooltip content={driverSlotTooltip}>
      <div
        ref={setNodeRef}
        className={`flex h-14 w-full shrink-0 cursor-default items-center border-b border-dashed border-border bg-surface text-left last:border-b-0 sm:h-16 sm:cursor-help ${isOver ? 'bg-accent-muted/30' : ''}`}
      >
        <span className="flex-1 px-2 py-1.5 text-sm text-text-muted sm:px-3 sm:py-2">
          Select a driver
        </span>
      </div>
    </Tooltip>
  );
}

/** "Verstappen" from "Max Verstappen", for the roster that stores no family name. */
function driverSurname(driver: Driver) {
  return driver.familyName || driver.displayName.split(' ').slice(1).join(' ');
}

/** Driver card in the pool – draggable so user can drag to picks list; tap still adds. */
function DraggableDriverCard({
  driver,
  pickedPosition,
  disabled,
  onTap,
}: {
  driver: Driver;
  /** 1-5 when this driver is already in the list, otherwise null. */
  pickedPosition: number | null;
  disabled: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: driver._id,
    disabled,
  });
  const picked = pickedPosition !== null;
  const surname = driverSurname(driver);
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      data-testid={`driver-${driver.code}`}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      disabled={disabled}
      /*
       * No `aria-label` here on purpose. It used to read "Kimi Antonelli" while
       * the card showed "ANT Antonelli", so the accessible name did not contain
       * the visible one (WCAG 2.5.3, Label in Name) and a voice-control user
       * saying "click ANT" hit nothing. The name now comes from the card's own
       * text, with the state appended below as screen-reader-only.
       */
      /*
       * Team colour is the 3px left bar, not the fill. Twenty-two saturated
       * tiles in a grid was the loudest surface in the app; confined to a bar
       * the same twenty-two are still instantly sortable by team, and the
       * code can sit at full contrast on a neutral surface.
       *
       * Hover is a surface step rather than an opacity change — opacity is
       * never used to signal hover in this system.
       *
       * The two reasons a card is disabled have to look different: a driver
       * already in the list carries the position that took him out of the
       * pool, while the rest simply grey out once five slots are full. Dimming
       * both identically made a picked driver read as "unavailable for some
       * reason" against twenty-one lookalikes.
       */
      /*
       * `@container` is on the button itself so the code/surname layout tracks
       * *this* cell's width, not the form's. At 5 columns the dashboard rail
       * leaves ~75px per pill — enough for "ANT" but not "ANT Antonelli" on
       * one line — so below 7.5rem the surname stacks under the code.
       */
      className={`gpp-team-bar @container flex min-h-11 w-full items-center justify-start gap-2 rounded-sm border py-2.5 pr-2 pl-3 text-left transition-colors duration-150 ease-out ${
        picked
          ? 'cursor-not-allowed border-accent/40 bg-accent-muted/15'
          : 'border-border bg-surface-elevated hover:border-border-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-elevated'
      }`}
      style={
        {
          '--team-colour':
            (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
        } as React.CSSProperties
      }
    >
      {/* Corner badge, not in the text flow — stacked surnames used to collide
          with an inline trailing P#. */}
      {picked ? (
        <span className="gpp-mono absolute top-1 right-1.5 text-[10px] leading-none font-semibold text-accent">
          P{pickedPosition}
        </span>
      ) : null}
      {/* Narrow: surname under the code. Wide: one baseline row. */}
      <span className="flex w-full min-w-0 flex-col gap-0.5 @min-[7.5rem]:flex-row @min-[7.5rem]:items-baseline @min-[7.5rem]:gap-2">
        <span
          className={`gpp-mono shrink-0 text-xs leading-none sm:text-sm ${
            picked ? 'text-text-muted' : 'text-text'
          }`}
        >
          {driver.code}
        </span>
        {/* Three-letter codes are the broadcast language, but a landing-page
            visitor may not know all twenty-two. Stack under the code when the
            pill is too narrow for a side-by-side pair. */}
        {surname ? (
          <span className="min-w-0 truncate text-xs leading-none text-text-muted @min-[7.5rem]:flex-1">
            {surname}
          </span>
        ) : null}
      </span>
      {/* Appended after the visible text so the accessible name still starts
          with what is on the card. */}
      {picked ? (
        <span className="sr-only">already picked</span>
      ) : disabled ? (
        <span className="sr-only">
          unavailable, five drivers already picked
        </span>
      ) : null}
    </button>
  );
}

/** Wrapper that makes the driver grid a drop target (drop a pick here to remove). */
function DriverPoolDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: DRIVER_POOL_DROPPABLE_ID,
  });
  return (
    <div
      ref={setNodeRef}
      // Columns follow the form's own width (container), not the viewport —
      // the dashboard center rail is ~640px wide while the viewport is `lg`,
      // and viewport breakpoints left a 4-col grid crushed into ~280px.
      className={`grid grid-cols-2 gap-2 @min-[360px]:grid-cols-3 @min-[480px]:grid-cols-4 @min-[640px]:grid-cols-5 ${isOver ? 'rounded-lg bg-accent-muted/20' : ''}`}
      data-testid="driver-selection"
    >
      {children}
    </div>
  );
}

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
  }) => ReactNode;
  /** Moves restored-draft status into parent chrome such as a step header. */
  draftNoticeTarget?: HTMLElement | null;
  /** Adds conversion-funnel properties/events without changing app forms. */
  analyticsSource?: 'landing';
  /** On narrow screens, put the actionable driver pool before the review list. */
  mobileActionFirst?: boolean;
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

type Top5Draft = {
  picks: Id<'drivers'>[];
  updatedAt: string;
};

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
  onComplete,
  onCompletionStateChange,
  onPicksChange,
  onStartOver,
}: PredictionFormProps) {
  const liveDrivers = useQuery(api.drivers.listDrivers);
  const drivers = liveDrivers ?? initialDrivers;
  const race = useQuery(api.races.getRace, { raceId });
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

  const [picks, setPicks] = useState<Id<'drivers'>[]>(
    existingPicks ?? initialDraftPicks ?? [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const now = useNow();
  // Data-driven, not identity-driven. See useCallbackRef.
  const reportCompletionState = useCallbackRef(onCompletionStateChange);
  const reportPicksChange = useCallbackRef<[Id<'drivers'>[]]>(onPicksChange);

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

  // Layout, not passive: the draft is the difference between five empty slots
  // and a filled grid, and a returning visitor should never watch the empty
  // version paint first. React flushes this re-render before the browser
  // paints, so the restore, the notice and every completion callback that
  // cascades off it (up to and including the landing page jumping to step 2)
  // resolve inside the same frame as hydration.
  useIsomorphicLayoutEffect(() => {
    const draft = loadPredictionDraft<Top5Draft>(draftKey);
    if (draft && draft.picks.length > 0) {
      setPicks(draft.picks);
      setRestoredDraftAt(suppressDraftRestoredNotice ? null : draft.updatedAt);
    } else {
      setPicks(existingPicks ?? initialDraftPicks ?? []);
      setRestoredDraftAt(null);
    }
    setHasHydratedDraft(true);
  }, [draftKey, existingPicks, initialDraftPicks, suppressDraftRestoredNotice]);

  useIsomorphicLayoutEffect(() => {
    if (hasHydratedDraft) {
      reportCompletionState(picks.length === 5);
    }
  }, [hasHydratedDraft, reportCompletionState, picks.length]);

  useIsomorphicLayoutEffect(() => {
    if (hasHydratedDraft) {
      reportPicksChange(picks);
    }
  }, [hasHydratedDraft, reportPicksChange, picks]);

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

  // Tooltip for empty slot: direction matches the live layout — pool above on
  // the landing mobile stack, below on the race page, right on lg+.
  const [driverSlotTooltip, setDriverSlotTooltip] = useState(() =>
    driverSlotTooltipCopy({
      wide:
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 1024px)').matches,
      driversAbove: mobileActionFirst,
    }),
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    function handler() {
      setDriverSlotTooltip(
        driverSlotTooltipCopy({
          wide: mql.matches,
          driversAbove: mobileActionFirst,
        }),
      );
    }
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mobileActionFirst]);

  const hasChanges = existingPicks
    ? JSON.stringify(picks) !== JSON.stringify(existingPicks)
    : picks.length > 0;

  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    if (hasChanges) {
      savePredictionDraft<Top5Draft>(draftKey, {
        picks,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    clearPredictionDraft(draftKey);
  }, [draftKey, hasChanges, hasHydratedDraft, picks]);

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
  const isRaceCurrentlyOpen = nextPredictionRace?._id === raceId;
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
  const { markInteraction } = useAutoSaveOnFirstComplete({
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
  const pickedDrivers = picks
    .map((id) => availableDrivers.find((d) => d._id === id))
    .filter((d): d is Driver => d !== undefined);

  const driversSortedByTeam = [...availableDrivers].sort((a, b) => {
    const teamA = teamStandingsIndex(a.team);
    const teamB = teamStandingsIndex(b.team);
    if (teamA !== teamB) {
      return teamA - teamB;
    }
    const numA = a.number ?? 999;
    const numB = b.number ?? 999;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.displayName.localeCompare(b.displayName);
  });

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
      captureAnalyticsEvent('prediction_submitted', {
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
      captureAnalyticsEvent('prediction_submit_failed', {
        race_id: raceId,
        race_slug: race?.slug,
        session_type: sessionType ?? 'cascade',
        is_edit: Boolean(existingPicks && existingPicks.length > 0),
      });
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? toUserFacingMessage(error)
          : 'Failed to submit prediction',
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
      setPendingSubmit(draftKey);
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
  // order-last keeps it beside "Your Picks" while the row fits on one line,
  // and makes it the first thing pushed off when the row runs out of space:
  // it is commentary, so it yields to the heading and the how-to hints.
  const pickStatusClassName = 'order-last text-sm font-normal text-text-muted';
  const pickStatus =
    picks.length >= 5 ? (
      <span className={pickStatusClassName}>Remove a pick to change</span>
    ) : (
      <span className={pickStatusClassName} data-testid="picks-remaining">
        {5 - picks.length} left
      </span>
    );

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
            className={`${mobileActionFirst ? 'order-2 scroll-mt-28 @min-[875px]:order-1' : ''} @min-[875px]:w-[min(100%,380px)] @min-[875px]:min-w-0 @min-[875px]:shrink-0`}
          >
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mb-3">
              <h3 className="text-lg font-semibold text-text">Your Picks</h3>
              {/* The status belongs to this list: it counts these slots and
                  the change it asks for happens here. Wraps to its own line
                  on narrow screens rather than squeezing the heading. */}
              {pickStatus}
              {picks.length < 5 ? (
                <p className="text-sm text-text-muted sm:hidden">
                  Tap drivers to fill your Top 5.
                </p>
              ) : null}
              {picks.length >= 2 ? (
                <p className="ml-auto flex shrink-0 items-center gap-1 text-xs text-text-muted sm:hidden">
                  Reorder: drag or use
                  <span
                    className="inline-flex items-center"
                    aria-label="up and down buttons"
                  >
                    <ChevronUp size={14} className="text-accent" aria-hidden />
                    <ChevronDown
                      size={14}
                      className="-ml-0.5 text-accent"
                      aria-hidden
                    />
                  </span>
                </p>
              ) : null}
            </div>
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
                <div className="flex min-w-0 flex-1 flex-col">
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
                        removeDriver={removeDriver}
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
              })
            ) : showSaveWall && renderSaveWall ? (
              renderSaveWall({ lockIn: () => requestSubmit() })
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:mt-4 sm:gap-4">
                <Button
                  variant="primary"
                  size="md"
                  className="w-100 max-w-full"
                  loading={isSubmitting}
                  saved={isUnchangedFromSaved}
                  disabled={
                    picks.length !== 5 ||
                    isSubmitting ||
                    isUnchangedFromSaved ||
                    isSubmissionBlocked
                  }
                  onClick={() => requestSubmit()}
                  data-testid="submit-prediction"
                >
                  {isUnchangedFromSaved ? (
                    <>
                      <Check size={20} className="shrink-0" />
                      Saved
                    </>
                  ) : isSubmitting ? (
                    'Saving...'
                  ) : !isAuthenticated ? (
                    'Sign in to save your picks'
                  ) : existingPicks && existingPicks.length > 0 ? (
                    'Save Changes'
                  ) : (
                    'Save Predictions'
                  )}
                </Button>

                {submitStatus === 'success' && (
                  <span className="text-sm text-success" aria-live="polite">
                    Predictions saved. You can edit them until this session
                    starts.
                  </span>
                )}

                {submitStatus === 'error' && (
                  <span
                    className="text-sm text-error"
                    data-testid="submit-error"
                    aria-live="assertive"
                  >
                    {errorMessage}
                  </span>
                )}
              </div>
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

          {/* Available Drivers - selection pool (right column when wide) */}
          <div
            className={`${mobileActionFirst ? 'order-1 @min-[875px]:order-2' : ''} @min-[875px]:min-w-0 @min-[875px]:flex-1`}
          >
            {/* The label only earns its line in the side-by-side layout, where
                it names the right-hand column against "Your Picks". Stacked it
                just repeats the section heading, so it stays sr-only then. */}
            <h3 className="mb-0 text-lg font-semibold text-text @min-[875px]:mb-3">
              <span className="sr-only @min-[875px]:not-sr-only">
                Select Drivers
              </span>
            </h3>
            {mobileActionFirst ? (
              /* Sentences are inline-block so the line breaks between them
                 rather than mid-sentence, and stays on one line when it fits. */
              <p className="mb-3 text-sm text-text-muted @min-[875px]:hidden">
                <span className="inline-block">
                  Tap drivers in finishing order.
                </span>{' '}
                <span className="inline-block">You can reorder later.</span>
              </p>
            ) : null}
            <DriverPoolDroppable>
              {driversSortedByTeam.map((driver) => {
                const pickedIndex = picks.indexOf(driver._id);
                const isPicked = pickedIndex !== -1;
                return (
                  <m.div
                    key={driver._id}
                    layout
                    initial={false}
                    tabIndex={-1}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                    whileHover={{
                      scale: isPicked || picks.length >= 5 ? 1 : 1.05,
                    }}
                    whileTap={{
                      scale: isPicked || picks.length >= 5 ? 1 : 0.95,
                    }}
                  >
                    <DraggableDriverCard
                      driver={driver}
                      pickedPosition={isPicked ? pickedIndex + 1 : null}
                      disabled={isPicked || picks.length >= 5}
                      onTap={() => addDriver(driver._id)}
                    />
                  </m.div>
                );
              })}
            </DriverPoolDroppable>
          </div>
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
