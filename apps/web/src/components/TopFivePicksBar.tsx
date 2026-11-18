import type { Id } from '@convex-generated/dataModel';
import type { CSSProperties } from 'react';

import type { RosterDriver } from '@/lib/roster';
import { isRacing, resolvePicks } from '@/lib/roster';

import { teamFillStyle } from '@/lib/teamColors';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';

/**
 * Five slots on one line, the Top 5 half of a saved prediction card.
 *
 * Same cell height as {@link H2HPicksBar}, and each pick wears its team colour
 * as a fill, as a picked driver does everywhere a pick is drawn
 * (`docs/design-display-register.md`, "Picked drivers"): five slots and eleven
 * battles read as one card, not two unrelated grids. A driver who has lost the
 * seat stays on the thin bar, struck through.
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
        const racing = isRacing(driver);
        const cellClassName = `gpp-team-bar flex h-9 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-sm border pr-1 pl-2 sm:h-7 ${
          racing ? 'gpp-team-fill' : 'border-border bg-surface-elevated'
        } ${
          onEdit
            ? 'transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none'
            : ''
        }`;
        const style = {
          '--team-colour':
            (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
          ...(racing ? teamFillStyle(driver.team) : {}),
        } as CSSProperties;
        const title = racing ? undefined : 'Not racing this round';

        const content = (
          <>
            <span
              className={`gpp-mono text-xs leading-none ${racing ? '' : 'text-accent'}`}
            >
              P{index + 1}
            </span>
            <span
              className={`gpp-mono truncate text-xs leading-none ${
                racing ? 'font-semibold' : 'text-text-muted line-through'
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
