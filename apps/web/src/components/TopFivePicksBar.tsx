import type { Doc, Id } from '@convex-generated/dataModel';
import type { CSSProperties } from 'react';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';

/**
 * Five slots on one line, the Top 5 half of a saved prediction card.
 *
 * Same cell height and stripe as {@link H2HPicksBar}, and the code sits against
 * its team colour rather than floating in the middle of a wide box: five slots
 * and eleven battles read as one card, not two unrelated grids.
 */
export function TopFivePicksBar({
  picks,
  drivers,
  className = 'mt-2',
}: {
  picks: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  className?: string;
}) {
  const pickedDrivers = picks
    .map((driverId) => drivers.find((driver) => driver._id === driverId))
    .filter((driver): driver is Doc<'drivers'> => driver !== undefined);

  if (pickedDrivers.length === 0) {
    return null;
  }

  return (
    <ol
      className={`grid grid-cols-5 gap-1 ${className}`}
      aria-label="Your Top 5, in order"
      data-testid="top-five-picks-bar"
    >
      {pickedDrivers.map((driver, index) => (
        <li
          key={driver._id}
          className="gpp-team-bar flex h-9 min-w-0 items-center gap-1.5 overflow-hidden rounded-sm border border-border bg-surface-elevated pr-1 pl-2 sm:h-7"
          style={
            {
              '--team-colour':
                (driver.team && TEAM_COLORS[driver.team]) ||
                FALLBACK_TEAM_COLOR,
            } as CSSProperties
          }
        >
          <span className="gpp-mono text-[10px] leading-none text-accent">
            P{index + 1}
          </span>
          <span className="gpp-mono truncate text-xs leading-none text-text">
            {driver.code}
          </span>
        </li>
      ))}
    </ol>
  );
}
