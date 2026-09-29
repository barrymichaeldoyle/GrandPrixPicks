import type { Id } from '@convex-generated/dataModel';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { m } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { CSSProperties } from 'react';

import { displayTeamName } from '@/lib/display';
import type { RosterDriver } from '@/lib/roster';
import { isRacing } from '@/lib/roster';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../DriverBadge';
import { Flag } from '../Flag';
import { Tooltip } from '../Tooltip';
import { emptySlotId } from './dndIds';

type Driver = RosterDriver;
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
export function SortablePickRow({
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
        // Position first: the P1-P5 column beside the list is aria-hidden, so
        // this is the only place a screen reader hears where the driver sits.
        aria-label={`P${position}, ${driver.displayName}. Drag to reorder`}
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
          {!isRacing(driver) ? (
            // The driver is no longer in a car for this round, but the pick is
            // still the player's: it stays in place, in position, and says so,
            // rather than vanishing and leaving four slots where five were
            // saved. Swapping it out is then an ordinary edit.
            <span
              className="flex min-w-0 items-center gap-1.5 text-xs text-error"
              data-testid={`pick-not-racing-${driver.code}`}
            >
              <span className="truncate">Not racing this round</span>
            </span>
          ) : (
            driver.team && (
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
            )
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
            aria-label={`Move ${driver.displayName} up`}
          >
            <ChevronUp size={14} className="text-accent" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              moveDown(index);
            }}
            disabled={index >= picksLength - 1}
            className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-accent-muted/40 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-30"
            aria-label={`Move ${driver.displayName} down`}
          >
            <ChevronDown size={14} className="text-accent" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeDriver(driver._id);
          }}
          className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-error-muted focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          aria-label={`Remove ${driver.displayName}`}
          data-testid={`remove-pick-${position}`}
        >
          <X size={16} className="text-error" aria-hidden />
        </button>
      </div>
    </m.div>
  );
}

/** Empty slot that accepts drops from the driver pool (and tap to set insert-at position). */
export function EmptySlotDroppable({
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
          <span className="sr-only">P{slotIndex + 1}, </span>
          Select a driver
        </span>
      </div>
    </Tooltip>
  );
}
