import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ReactNode } from 'react';

function TapToFillHint() {
  return (
    <p className="text-sm text-text-muted sm:hidden">
      Tap drivers to fill your Top 5.
    </p>
  );
}

function ReorderHint() {
  return (
    <p className="ml-auto flex shrink-0 items-center gap-1 text-xs text-text-muted sm:hidden">
      Reorder: drag or use
      <span className="inline-flex items-center">
        <span className="sr-only">the up and down buttons</span>
        <ChevronUp size={14} className="text-accent" aria-hidden />
        <ChevronDown size={14} className="-ml-0.5 text-accent" aria-hidden />
      </span>
    </p>
  );
}

/** What sits above the pick list: its heading (or not), the count and hints. */
export function PicksListHeader({
  hidePicksHeading,
  pickCount,
  pickStatus,
  inlineSaveStatus,
}: {
  hidePicksHeading: boolean;
  pickCount: number;
  pickStatus: ReactNode;
  inlineSaveStatus: ReactNode;
}) {
  if (hidePicksHeading) {
    return (
      // Side by side, the status moves up beside "Select Drivers" (see
      // the pool's heading) and the column's top padding stands in for
      // it, so the list starts level with the driver grid.
      <div className="mb-2 space-y-1 sm:mb-3 @min-[875px]:hidden">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {pickStatus}
          {inlineSaveStatus}
        </div>
        <div className="flex min-h-5 items-center">
          {pickCount < 5 ? <TapToFillHint /> : null}
          {pickCount >= 2 ? <ReorderHint /> : null}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mb-3">
      <h3 className="text-lg font-semibold text-text">Your Picks</h3>
      {/* The status belongs to this list: it counts these slots and
          the change it asks for happens here. */}
      {pickStatus}
      {pickCount < 5 ? <TapToFillHint /> : null}
      {pickCount >= 2 ? <ReorderHint /> : null}
    </div>
  );
}
