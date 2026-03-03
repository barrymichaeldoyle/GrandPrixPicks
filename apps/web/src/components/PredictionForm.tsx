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
import { useBlocker } from '@tanstack/react-router';
import confetti from 'canvas-confetti';
import { useMutation, useQuery } from 'convex/react';
import { motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

import { displayTeamName } from '@/lib/display';
import {
  clearPredictionDraft,
  loadPredictionDraft,
  savePredictionDraft,
} from '@/lib/predictionDrafts';
import { teamStandingsIndex } from '@/lib/teams';
import { toUserFacingMessage } from '@/lib/userFacingError';

import type { SessionType } from '../lib/sessions';
import { Button } from './Button';
import { TEAM_COLORS } from './DriverBadge';
import { Flag } from './Flag';
import { InlineLoader } from './InlineLoader';
import { Tooltip } from './Tooltip';

const DRIVER_SLOT_TOOLTIP = {
  narrow: 'Select from the driver cards below',
  lg: 'Select from the driver cards to the right',
};

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
    <div
      className="flex h-full w-12 shrink-0 flex-col items-center justify-center py-1 text-white sm:w-14"
      style={{
        backgroundColor: driver.team && (TEAM_COLORS[driver.team] ?? '#666'),
      }}
    >
      {driver.number != null && (
        <span className="font-mono text-sm leading-none font-bold sm:text-base">
          {driver.number}
        </span>
      )}
      <span className="font-mono text-[10px] leading-none font-bold tracking-wider text-white/90 sm:text-xs">
        {driver.code}
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
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!isDragging}
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 30 },
      }}
      data-testid={`picked-driver-${position}`}
      className={`relative flex h-14 shrink-0 items-stretch gap-0 border-b border-transparent bg-surface-muted sm:h-16 ${isDragging ? 'z-10 shadow-lg' : ''}`}
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
            <span className="truncate text-xs text-text-muted">
              {displayTeamName(driver.team)}
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
            className="p-1 transition-colors hover:bg-accent-muted/40 disabled:opacity-30"
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
            className="p-1 transition-colors hover:bg-accent-muted/40 disabled:opacity-30"
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
          className="rounded p-1 transition-colors hover:bg-error-muted"
          aria-label="Remove"
          data-testid={`remove-pick-${position}`}
        >
          <X size={16} className="text-error" />
        </button>
      </div>
    </motion.div>
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
        className={`flex h-14 w-full shrink-0 cursor-pointer items-center border-b border-dashed border-border bg-surface text-left last:border-b-0 sm:h-16 sm:cursor-help ${isOver ? 'bg-accent-muted/30' : ''}`}
      >
        <span className="flex-1 px-2 py-1.5 text-sm text-text-muted sm:px-3 sm:py-2">
          Select a driver
        </span>
      </div>
    </Tooltip>
  );
}

/** Driver card in the pool – draggable so user can drag to picks list; tap still adds. */
function DraggableDriverCard({
  driver,
  disabled,
  onTap,
}: {
  driver: Driver;
  disabled: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: driver._id,
    disabled,
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <button
        type="button"
        data-testid={`driver-${driver.code}`}
        onClick={(e) => {
          e.stopPropagation();
          onTap();
        }}
        disabled={disabled}
        aria-label={`${driver.displayName}${disabled ? ' (already selected)' : ''}`}
        className="flex h-full w-full flex-col items-center justify-center gap-0 rounded-lg border border-transparent py-2 font-mono text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:py-3"
        style={{
          backgroundColor: driver.team && (TEAM_COLORS[driver.team] ?? '#666'),
        }}
      >
        {driver.number != null && (
          <span className="text-sm leading-none font-bold sm:text-base">
            {driver.number}
          </span>
        )}
        <span className="text-xs leading-none font-bold tracking-wider sm:text-sm">
          {driver.code}
        </span>
      </button>
    </div>
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
      className={`grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-4 ${isOver ? 'rounded-lg bg-accent-muted/20' : ''}`}
      data-testid="driver-selection"
    >
      {children}
    </div>
  );
}

interface PredictionFormProps {
  raceId: Id<'races'>;
  existingPicks?: Array<Id<'drivers'>>;
  /** If provided, only update this specific session. Otherwise cascade to all. */
  sessionType?: SessionType;
  /** Called after a successful submit (e.g. to close an edit view). */
  onSuccess?: () => void;
  /** Emits whether the form currently has unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void;
}

type Top5Draft = {
  picks: Array<Id<'drivers'>>;
  updatedAt: string;
};

export function PredictionForm({
  raceId,
  existingPicks,
  sessionType,
  onSuccess,
  onDirtyChange,
}: PredictionFormProps) {
  const drivers = useQuery(api.drivers.listDrivers);
  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const draftKey = getWebTop5DraftStorageKey(raceId, sessionType);

  const [picks, setPicks] = useState<Array<Id<'drivers'>>>(existingPicks ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  useEffect(() => {
    const draft = loadPredictionDraft<Top5Draft>(draftKey);
    if (draft && draft.picks.length > 0) {
      setPicks(draft.picks);
      setRestoredDraftAt(draft.updatedAt);
    } else {
      setPicks(existingPicks ?? []);
      setRestoredDraftAt(null);
    }
    setHasHydratedDraft(true);
  }, [draftKey, existingPicks]);

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

  // Tooltip for empty slot: "cards below" on narrow, "cards to the right" on lg+ (matches layout)
  const [driverSlotTooltip, setDriverSlotTooltip] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px)').matches
      ? DRIVER_SLOT_TOOLTIP.lg
      : DRIVER_SLOT_TOOLTIP.narrow,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    function handler() {
      setDriverSlotTooltip(
        mql.matches ? DRIVER_SLOT_TOOLTIP.lg : DRIVER_SLOT_TOOLTIP.narrow,
      );
    }
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

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
    disabled: !hasChanges,
  });

  useEffect(() => {
    if (blocker.status !== 'blocked') {
      return;
    }
    const confirmLeave = window.confirm(
      'You have unsaved predictions. Leave this page without submitting your picks?',
    );
    if (confirmLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  if (drivers === undefined) {
    return <InlineLoader />;
  }

  const pickedDrivers = picks
    .map((id) => drivers.find((d) => d._id === id))
    .filter((d): d is Driver => d !== undefined);

  const driversSortedByTeam = [...drivers].sort((a, b) => {
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
    setPicks([...picks, driverId]);
    setSubmitStatus('idle');
  }

  function removeDriver(driverId: Id<'drivers'>) {
    setPicks(picks.filter((id) => id !== driverId));
    setSubmitStatus('idle');
  }

  /** Insert driver at slot index (0–4). Used when dropping from pool onto a row. */
  function addDriverAtPosition(driverId: Id<'drivers'>, slotIndex: number) {
    const without = picks.filter((id) => id !== driverId);
    const next = [...without];
    next.splice(slotIndex, 0, driverId);
    setPicks(next.slice(0, 5));
    setSubmitStatus('idle');
  }

  function moveUp(index: number) {
    if (index === 0) {
      return;
    }
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
    const newPicks = [...picks];
    [newPicks[index], newPicks[index + 1]] = [
      newPicks[index + 1],
      newPicks[index],
    ];
    setPicks(newPicks);
    setSubmitStatus('idle');
  }

  async function handleSubmit() {
    if (picks.length !== 5) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await submitPrediction({ raceId, picks, sessionType });
      posthog.capture('prediction_submitted', {
        session_type: sessionType ?? 'cascade',
      });
      setSubmitStatus('success');
      if (existingPicks && existingPicks.length > 0) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
      clearPredictionDraft(draftKey);
      setRestoredDraftAt(null);
      onSuccess?.();
    } catch (error) {
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

  /** When editing existing picks: current selection matches saved → show Saved, disable button */
  const isUnchangedFromSaved = Boolean(
    existingPicks?.length === 5 && picks.length === 5 && !hasChanges,
  );

  function handleDiscardDraft() {
    setPicks(existingPicks ?? []);
    setSubmitStatus('idle');
    setErrorMessage('');
    setRestoredDraftAt(null);
    clearPredictionDraft(draftKey);
  }

  // Empty slots needed
  const emptySlots = 5 - pickedDrivers.length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 sm:space-y-6">
        {restoredDraftAt ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/35 bg-accent-muted/20 px-3 py-2">
            <span className="text-xs text-text">
              Draft restored: {new Date(restoredDraftAt).toLocaleString()}
            </span>
            <Button variant="text" size="inline" onClick={handleDiscardDraft}>
              Discard Draft
            </Button>
          </div>
        ) : null}
        {/* Two-column layout on desktop: Your Picks | Select Drivers */}
        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* Your Picks - sortable list via @dnd-kit */}
          <div
            data-testid="your-picks"
            className="lg:min-w-0 lg:min-w-[400px] lg:flex-1"
          >
            <h3 className="mb-2 text-lg font-semibold text-text sm:mb-3">
              Your Picks
            </h3>
            <p className="mb-2 text-sm text-text-muted sm:hidden">
              Tap drivers to add. Drag to reorder, or use ↑↓.
            </p>
            <div
              className="flex overflow-hidden rounded-xl border border-border bg-surface"
              data-testid="picks-list"
            >
              <div className="flex shrink-0 flex-col border-r border-border bg-surface-muted/50">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="flex h-14 w-9 shrink-0 items-center justify-center border-b border-border text-sm font-bold text-accent last:border-b-0 sm:h-16 sm:w-11"
                    aria-hidden
                  >
                    {n}
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

            {/* Submit row - directly under Your Picks */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:mt-4 sm:gap-4">
              <Button
                variant="primary"
                size="md"
                className="w-100 max-w-full"
                loading={isSubmitting}
                saved={isUnchangedFromSaved}
                disabled={
                  picks.length !== 5 || isSubmitting || isUnchangedFromSaved
                }
                onClick={handleSubmit}
                data-testid="submit-prediction"
              >
                {isUnchangedFromSaved ? (
                  <>
                    <Check size={20} className="shrink-0" />
                    Saved
                  </>
                ) : isSubmitting ? (
                  'Saving...'
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
            <p className="mt-2 text-center text-xs text-text-muted">
              You can edit your picks any time before this session starts.
            </p>
          </div>

          {/* Available Drivers - selection pool (right column on desktop) */}
          <div className="lg:min-w-0 lg:flex-[2]">
            <h3 className="mb-2 text-lg font-semibold text-text sm:mb-3">
              Select Drivers
              {picks.length >= 5 ? (
                <span className="ml-2 text-sm font-normal text-text-muted">
                  (remove a pick to change)
                </span>
              ) : (
                <span
                  className="ml-2 text-sm font-normal text-text-muted"
                  data-testid="picks-remaining"
                >
                  Select {5 - picks.length} more driver
                  {5 - picks.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <DriverPoolDroppable>
              {driversSortedByTeam.map((driver) => {
                const isPicked = picks.includes(driver._id);
                return (
                  <motion.div
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
                      disabled={isPicked || picks.length >= 5}
                      onTap={() => addDriver(driver._id)}
                    />
                  </motion.div>
                );
              })}
            </DriverPoolDroppable>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
