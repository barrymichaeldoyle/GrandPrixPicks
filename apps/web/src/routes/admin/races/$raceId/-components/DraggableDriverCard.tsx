import type { Doc, Id } from '@convex-generated/dataModel';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

import { DriverSearchSelect } from '@/components/DriverSearchSelect';

type DraggableDriverCardProps = {
  driverId: Id<'drivers'>;
  index: number;
  excludedIds: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  setPosition: (index: number, driverId: Id<'drivers'> | null) => void;
  toggleClassified: (driverId: Id<'drivers'>) => void;
  dnfDriverIds: Id<'drivers'>[];
  registerInput: (el: HTMLInputElement | null) => void;
};

export function DraggableDriverCard({
  driverId,
  index,
  excludedIds,
  drivers,
  setPosition,
  toggleClassified,
  dnfDriverIds,
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
        <input
          type="checkbox"
          checked={!dnfDriverIds.includes(driverId)}
          onChange={() => toggleClassified(driverId)}
          className="h-3 w-3 rounded border-slate-500 bg-slate-800 text-yellow-400"
        />
        Classified
      </label>
    </div>
  );
}
