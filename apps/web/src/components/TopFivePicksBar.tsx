import type { Id } from '@convex-generated/dataModel';
import type { CSSProperties } from 'react';

import type { RosterDriver } from '@/lib/roster';
import { isRacing, resolvePicks } from '@/lib/roster';

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
  onEdit,
}: {
  picks: Id<'drivers'>[];
  drivers: RosterDriver[];
  className?: string;
  /**
   * Open the Top 5 editor. Pass it wherever the picks can still change: the
   * duel chips beside this bar have always been tappable, so five cells that
   * looked the same and did nothing read as the Top 5 being the locked half of
   * a card that is in fact fully editable.
   *
   * Omit for a read-only bar (a locked session, the landing page's preview).
   */
  onEdit?: () => void;
}) {
  // Five saved picks render as five slots. A driver who has lost their seat
  // since the pick was made is shown struck through rather than dropped,
  // because a bar that quietly loses a cell reads as picks that were never
  // made.
  const pickedDrivers = resolvePicks(picks, drivers);

  if (pickedDrivers.length === 0) {
    return null;
  }

  return (
    <ol
      className={`grid grid-cols-5 gap-1 ${className}`}
      aria-label="Your Top 5, in order"
      data-testid="top-five-picks-bar"
    >
      {pickedDrivers.map((driver, index) => {
        const cellClassName = `gpp-team-bar flex h-9 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-sm border border-border bg-surface-elevated pr-1 pl-2 sm:h-7 ${
          onEdit
            ? 'transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none'
            : ''
        }`;
        const style = {
          '--team-colour':
            (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
        } as CSSProperties;
        const title = isRacing(driver) ? undefined : 'Not racing this round';

        const content = (
          <>
            <span className="gpp-mono text-[10px] leading-none text-accent">
              P{index + 1}
            </span>
            <span
              className={`gpp-mono truncate text-xs leading-none ${
                isRacing(driver) ? 'text-text' : 'text-text-muted line-through'
              }`}
            >
              {driver.code}
            </span>
          </>
        );

        return (
          <li key={driver._id} className="min-w-0">
            {onEdit ? (
              // `tabIndex={-1}` on purpose. All five cells run the same action,
              // so putting them in the tab order would spend five stops on one
              // thing; the "Edit" button sitting directly above this bar is the
              // keyboard and screen-reader route, and it is already labelled.
              // The cells stay real buttons so they are still announced as
              // operable to anyone browsing the list.
              <button
                type="button"
                tabIndex={-1}
                onClick={onEdit}
                title={title}
                aria-label={`Edit your Top 5. P${index + 1}, ${driver.code}`}
                className={cellClassName}
                style={style}
              >
                {content}
              </button>
            ) : (
              <span className={cellClassName} style={style} title={title}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
