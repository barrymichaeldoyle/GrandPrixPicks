import type { Doc, Id } from '@convex-generated/dataModel';
import type { DriverStatus } from '@grandprixpicks/shared/driverStatus';
import {
  DRIVER_STATUS_DESCRIPTIONS,
  DRIVER_STATUSES,
} from '@grandprixpicks/shared/driverStatus';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

import { DriverSearchSelect } from '@/components/DriverSearchSelect';

type DraggableDriverCardProps = {
  driverId: Id<'drivers'>;
  index: number;
  excludedIds: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  setPosition: (index: number, driverId: Id<'drivers'> | null) => void;
  driverStatuses: Record<string, DriverStatus>;
  setDriverStatus: (
    driverId: Id<'drivers'>,
    status: DriverStatus | null,
  ) => void;
  registerInput: (el: HTMLInputElement | null) => void;
};

export function DraggableDriverCard({
  driverId,
  index,
  excludedIds,
  drivers,
  setPosition,
  driverStatuses,
  setDriverStatus,
  registerInput,
}: DraggableDriverCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: driverId,
      data: { index },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg ${
        isDragging
          ? 'z-20 cursor-grabbing bg-slate-800 shadow-xl ring-2 ring-yellow-500/50'
          : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab touch-none items-center rounded p-1 text-slate-400 hover:bg-slate-600 hover:text-slate-200 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <DriverSearchSelect
          drivers={drivers}
          value={driverId}
          excludedIds={excludedIds}
          onChange={(id) => setPosition(index, id)}
          placeholder="Search by name or code…"
          inputRef={registerInput}
        />
      </div>
      <label className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
        <span className="sr-only">Result status</span>
        <select
          value={driverStatuses[driverId] ?? ''}
          onChange={(e) =>
            setDriverStatus(
              driverId,
              e.target.value === '' ? null : (e.target.value as DriverStatus),
            )
          }
          className="rounded border border-slate-600 bg-slate-800 px-1.5 py-1 text-xs text-slate-200 focus:border-yellow-500 focus:outline-none"
        >
          <option value="">Classified</option>
          {DRIVER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {DRIVER_STATUS_DESCRIPTIONS[status]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
