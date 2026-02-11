import confetti from 'canvas-confetti';
import { useMutation, useQuery } from 'convex/react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { DragEvent } from 'react';
import { useEffect, useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
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

type Driver = Doc<'drivers'>;

/** Single pick row – whole card is draggable; buttons stop propagation so they don't start drag */
function PickedDriverRow({
  driverId,
  driver,
  index,
  picksLength,
  addDriverAtPosition,
  moveUp,
  moveDown,
  removeDriver,
}: {
  driverId: Id<'drivers'>;
  driver: Driver;
  index: number;
  picksLength: number;
  addDriverAtPosition: (driverId: Id<'drivers'>, slotIndex: number) => void;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  removeDriver: (id: Id<'drivers'>) => void;
}) {
  const position = index + 1;
  return (
    <Reorder.Item
      value={driverId}
      as="div"
      data-testid={`picked-driver-${position}`}
      className="relative flex h-14 shrink-0 cursor-grab touch-none items-stretch gap-0 border-b border-transparent bg-surface-muted active:cursor-grabbing sm:h-16"
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 22,
      }}
      whileDrag={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('text/plain'))
          e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (id) addDriverAtPosition(id as Id<'drivers'>, index);
      }}
    >
      <div
        className="flex w-12 shrink-0 flex-col items-center justify-center py-1 text-white sm:w-14"
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
      <div
        className="flex shrink-0 items-center gap-0.5 pr-0.5 pl-1 sm:pl-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveUp(index);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={index === 0}
            className="min-h-[44px] min-w-[44px] rounded p-1 transition-colors hover:bg-accent-muted/40 disabled:opacity-30 sm:min-h-0 sm:min-w-0 sm:p-1.5"
            aria-label="Move up"
          >
            <ChevronUp size={16} className="text-accent" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveDown(index);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={index >= picksLength - 1}
            className="min-h-[44px] min-w-[44px] rounded p-1 transition-colors hover:bg-accent-muted/40 disabled:opacity-30 sm:min-h-0 sm:min-w-0 sm:p-1.5"
            aria-label="Move down"
          >
            <ChevronDown size={16} className="text-accent" />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeDriver(driver._id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-h-[44px] min-w-[44px] rounded p-1 transition-colors hover:bg-error-muted sm:min-h-0 sm:min-w-0 sm:p-1.5"
          aria-label="Remove"
          data-testid={`remove-pick-${position}`}
        >
          <X size={16} className="text-error" />
        </button>
      </div>
    </Reorder.Item>
  );
}

interface PredictionFormProps {
  raceId: Id<'races'>;
  existingPicks?: Array<Id<'drivers'>>;
  /** If provided, only update this specific session. Otherwise cascade to all. */
  sessionType?: SessionType;
  /** Called after a successful submit (e.g. to close an edit view). */
  onSuccess?: () => void;
}

export function PredictionForm({
  raceId,
  existingPicks,
  sessionType,
  onSuccess,
}: PredictionFormProps) {
  const drivers = useQuery(api.drivers.listDrivers);
  const submitPrediction = useMutation(api.predictions.submitPrediction);

  const [picks, setPicks] = useState<Array<Id<'drivers'>>>(existingPicks ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');
  /** On mobile, tap empty slot then tap driver to insert at that position. */
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  // Sync with existing picks when they load
  useEffect(() => {
    if (existingPicks && existingPicks.length > 0) {
      setPicks(existingPicks);
    }
  }, [existingPicks]);

  // Clear insert-at-position when list is full
  useEffect(() => {
    if (picks.length >= 5) setInsertAtIndex(null);
  }, [picks.length]);

  // Tooltip for empty slot: "cards below" on narrow, "cards to the right" on lg+ (matches layout)
  const [driverSlotTooltip, setDriverSlotTooltip] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px)').matches
      ? DRIVER_SLOT_TOOLTIP.lg
      : DRIVER_SLOT_TOOLTIP.narrow,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = () => {
      setDriverSlotTooltip(
        mql.matches ? DRIVER_SLOT_TOOLTIP.lg : DRIVER_SLOT_TOOLTIP.narrow,
      );
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (drivers === undefined) {
    return <InlineLoader />;
  }

  const pickedDrivers = picks
    .map((id) => drivers.find((d) => d._id === id))
    .filter((d): d is Driver => d !== undefined);

  const availableDrivers = drivers.filter((d) => !picks.includes(d._id));

  const addDriver = (driverId: Id<'drivers'>) => {
    if (picks.length >= 5) return;
    if (picks.includes(driverId)) return;
    setPicks([...picks, driverId]);
    setSubmitStatus('idle');
  };

  /** Add driver at a specific slot (used when insertAtIndex is set, e.g. after tapping empty slot on mobile). */
  const addDriverOrInsert = (driverId: Id<'drivers'>) => {
    if (insertAtIndex !== null) {
      addDriverAtPosition(driverId, insertAtIndex);
      setInsertAtIndex(null);
    } else {
      addDriver(driverId);
    }
  };

  const removeDriver = (driverId: Id<'drivers'>) => {
    setPicks(picks.filter((id) => id !== driverId));
    setSubmitStatus('idle');
  };

  /** Insert driver at slot index (0–4). Used when dropping from pool onto a row. */
  const addDriverAtPosition = (driverId: Id<'drivers'>, slotIndex: number) => {
    const without = picks.filter((id) => id !== driverId);
    const next = [...without];
    next.splice(slotIndex, 0, driverId);
    setPicks(next.slice(0, 5));
    setSubmitStatus('idle');
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPicks = [...picks];
    [newPicks[index - 1], newPicks[index]] = [
      newPicks[index],
      newPicks[index - 1],
    ];
    setPicks(newPicks);
    setSubmitStatus('idle');
  };

  const moveDown = (index: number) => {
    if (index >= picks.length - 1) return;
    const newPicks = [...picks];
    [newPicks[index], newPicks[index + 1]] = [
      newPicks[index + 1],
      newPicks[index],
    ];
    setPicks(newPicks);
    setSubmitStatus('idle');
  };

  const handleReorder = (newOrder: Array<Id<'drivers'>>) => {
    setPicks(newOrder);
    setSubmitStatus('idle');
  };

  const handleSubmit = async () => {
    if (picks.length !== 5) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await submitPrediction({ raceId, picks, sessionType });
      setSubmitStatus('success');
      if (existingPicks && existingPicks.length > 0) {
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
        error instanceof Error ? error.message : 'Failed to submit prediction',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = existingPicks
    ? JSON.stringify(picks) !== JSON.stringify(existingPicks)
    : picks.length > 0;

  /** When editing existing picks: current selection matches saved → show Saved, disable button */
  const isUnchangedFromSaved = Boolean(
    existingPicks?.length === 5 && picks.length === 5 && !hasChanges,
  );

  // Empty slots needed
  const emptySlots = 5 - pickedDrivers.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Two-column layout on desktop: Your Picks | Select Drivers */}
      <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Your Picks - tier list: static positions + draggable cards */}
        <div
          data-testid="your-picks"
          className="lg:min-w-0 lg:min-w-[400px] lg:flex-1"
        >
          <h3 className="mb-2 text-lg font-semibold text-text sm:mb-3">
            Your Picks
          </h3>
          <p className="mb-2 text-sm text-text-muted sm:hidden">
            Tap drivers to add; use ↑↓ to reorder.
          </p>
          <div
            className="flex overflow-hidden rounded-xl border border-border bg-surface"
            data-testid="picks-list"
          >
            {/* Static position lanes (tier-list style) */}
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

            {/* Draggable cards + empty slots (cards move between lanes) */}
            <Reorder.Group
              as="div"
              axis="y"
              values={picks}
              onReorder={handleReorder}
              className="flex min-w-0 flex-1 flex-col"
            >
              <AnimatePresence mode="popLayout">
                {picks.map((driverId, index) => {
                  const driver = drivers.find((d) => d._id === driverId);
                  if (!driver) return null;
                  return (
                    <PickedDriverRow
                      key={driverId}
                      driverId={driverId}
                      driver={driver}
                      index={index}
                      picksLength={picks.length}
                      addDriverAtPosition={addDriverAtPosition}
                      moveUp={moveUp}
                      moveDown={moveDown}
                      removeDriver={removeDriver}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Empty lanes */}
              {Array.from({ length: emptySlots }).map((_, i) => {
                const slotIndex = picks.length + i;
                const isInsertTarget = insertAtIndex === slotIndex;
                return (
                  <Tooltip
                    key={`empty-${i}`}
                    content={
                      isInsertTarget
                        ? 'Now tap a driver below to add here'
                        : driverSlotTooltip
                    }
                  >
                    <button
                      type="button"
                      className={`flex h-14 w-full shrink-0 cursor-pointer items-center border-b border-dashed border-border bg-surface text-left last:border-b-0 sm:h-16 sm:cursor-help ${isInsertTarget ? 'bg-accent-muted/50' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.types.includes('text/plain'))
                          e.dataTransfer.dropEffect = 'copy';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData('text/plain');
                        if (id)
                          addDriverAtPosition(id as Id<'drivers'>, slotIndex);
                      }}
                      onClick={() => setInsertAtIndex(slotIndex)}
                    >
                      <span className="flex-1 px-2 py-1.5 text-sm text-text-muted sm:px-3 sm:py-2">
                        {isInsertTarget
                          ? 'Tap a driver below →'
                          : 'Select a driver'}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </Reorder.Group>
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
                'Update Prediction'
              ) : (
                'Submit Prediction'
              )}
            </Button>

            {picks.length < 5 && (
              <span
                className="text-sm text-text-muted"
                data-testid="picks-remaining"
              >
                Select {5 - picks.length} more driver
                {5 - picks.length !== 1 ? 's' : ''}
              </span>
            )}

            {submitStatus === 'error' && (
              <span className="text-sm text-error" data-testid="submit-error">
                {errorMessage}
              </span>
            )}
          </div>
        </div>

        {/* Available Drivers - selection pool (right column on desktop) */}
        <div className="lg:min-w-0 lg:flex-[2]">
          <h3 className="mb-2 text-lg font-semibold text-text sm:mb-3">
            Select Drivers
            {picks.length >= 5 && (
              <span className="ml-2 text-sm font-normal text-text-muted">
                (remove a pick to change)
              </span>
            )}
          </h3>
          <motion.div
            layout
            className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-4"
            data-testid="driver-selection"
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              if (e.dataTransfer.types.includes('application/x-pick-from-list'))
                e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('application/x-pick-from-list');
              if (id) removeDriver(id as Id<'drivers'>);
            }}
          >
            <AnimatePresence mode="popLayout">
              {availableDrivers.map((driver) => (
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
                  whileHover={{ scale: picks.length >= 5 ? 1 : 1.05 }}
                  whileTap={{ scale: picks.length >= 5 ? 1 : 0.95 }}
                >
                  <button
                    type="button"
                    data-testid={`driver-${driver.code}`}
                    onClick={() => addDriverOrInsert(driver._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        addDriverOrInsert(driver._id);
                      }
                    }}
                    disabled={picks.length >= 5}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', driver._id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="flex h-full w-full flex-col items-center justify-center gap-0 rounded-lg border border-transparent py-2 font-mono text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:py-3"
                    style={{
                      backgroundColor:
                        driver.team && (TEAM_COLORS[driver.team] ?? '#666'),
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
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
