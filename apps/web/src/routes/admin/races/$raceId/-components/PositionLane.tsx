import type { Doc, Id } from '@convex-generated/dataModel';
import { useDroppable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

import { DriverSearchSelect } from '@/components/DriverSearchSelect';

import { DraggableDriverCard } from './DraggableDriverCard';
import { LANE_ID_PREFIX } from './laneUtils';

type PositionLaneProps = {
  index: number;
  driverId: Id<'drivers'> | null;
  excludedIds: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  setPosition: (index: number, driverId: Id<'drivers'> | null) => void;
  toggleClassified: (driverId: Id<'drivers'>) => void;
  dnfDriverIds: Id<'drivers'>[];
  activeDriverId: string | null;
  registerInput: (el: HTMLInputElement | null) => void;
};

export function PositionLane({
  index,
  driverId,
  excludedIds,
  drivers,
  setPosition,
  toggleClassified,
  dnfDriverIds,
  activeDriverId,
  registerInput,
}: PositionLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${LANE_ID_PREFIX}${index}`,
    data: { index },
  });

  const isPlaceholder = driverId != null && activeDriverId === driverId;

  return (
    <div className="flex items-stretch gap-2">
      {/* Fixed position label */}
      <div
        className="flex w-12 shrink-0 items-center justify-center rounded-l-lg border border-r-0 border-slate-600 bg-slate-800/80 text-sm font-bold text-yellow-400"
        aria-hidden
      >
        P{index + 1}
      </div>
      {/* Droppable lane */}
      <div
        ref={setNodeRef}
        className={`min-h-[52px] min-w-0 flex-1 rounded-r-lg border border-slate-600 transition-colors ${
          isOver ? 'border-yellow-500 bg-yellow-500/10' : 'bg-slate-800/30'
        } ${isPlaceholder ? 'border-dashed' : ''}`}
      >
        {driverId != null && !isPlaceholder ? (
          <div className="p-1.5">
            <DraggableDriverCard
              driverId={driverId}
              index={index}
              excludedIds={excludedIds}
              drivers={drivers}
              setPosition={setPosition}
              toggleClassified={toggleClassified}
              dnfDriverIds={dnfDriverIds}
              registerInput={registerInput}
            />
          </div>
        ) : isPlaceholder ? (
          <div className="flex h-full min-h-[50px] items-center justify-center rounded border-2 border-dashed border-slate-500 text-sm text-slate-500">
            Drop here
          </div>
        ) : (
          <div className="p-1.5">
            {/* Mirrors the filled-lane row (grip + select + checkbox) with
                invisible placeholders so picking a driver causes no layout shift. */}
            <div className="flex items-center gap-2">
              <div className="invisible shrink-0 p-1" aria-hidden>
                <GripVertical size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <DriverSearchSelect
                  drivers={drivers}
                  value={null}
                  excludedIds={excludedIds}
                  onChange={(id) => setPosition(index, id)}
                  placeholder="Search by name or code…"
                  inputRef={registerInput}
                />
              </div>
              <span
                className="invisible flex shrink-0 items-center gap-2 text-xs"
                aria-hidden
              >
                <span className="h-3 w-3" />
                Classified
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
