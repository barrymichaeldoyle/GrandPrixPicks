import type { CSSProperties } from 'react';

import type { RosterDriver } from '@/lib/roster';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../DriverBadge';

/**
 * Stays with the driver pool; the full list below owns editing and saving.
 *
 * It is rendered inside the pool's column, so the sticky ends where the pool
 * does. Pinned for the whole form it sat over the full pick list as a second
 * copy of it, and the auto-scroll after the fifth pick left a strip of pool
 * cards showing between the two.
 *
 * `--picks-sticky-top` is set by a scroll container that has no site header
 * above it (the picks overlay); on the page it falls back to the header.
 *
 * It only pins while there is something left to pick. The fifth pick scrolls
 * to the list, and where the content below is too short to bring the list to
 * the top (the overlay), a pinned summary sliced the pool cards above it.
 */
export function MobilePickSummary({
  drivers,
  reviewId,
  onReview,
}: {
  drivers: RosterDriver[];
  reviewId: string;
  onReview: (position?: number) => void;
}) {
  return (
    <div
      className={`${drivers.length < 5 ? 'sticky top-[var(--picks-sticky-top,var(--nav-height))] z-30' : ''} mb-3 border-b border-border bg-page py-2 @min-[875px]:hidden`}
      data-testid="mobile-pick-summary"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text" aria-live="polite">
          Your Top 5{' '}
          <span className="gpp-mono text-text-muted">{drivers.length}/5</span>
        </p>
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-medium text-text underline underline-offset-4 hover:text-accent disabled:text-text-disabled disabled:no-underline"
          disabled={drivers.length === 0}
          aria-controls={reviewId}
          onClick={() => onReview()}
        >
          Review picks
        </button>
      </div>
      <ol
        aria-label="Current pick order"
        className="grid grid-cols-5 gap-1.5 pb-1"
      >
        {Array.from({ length: 5 }, (_, index) => {
          const driver = drivers[index];
          return (
            <li key={index} className="min-w-0">
              <button
                type="button"
                onClick={() => onReview(index + 1)}
                disabled={!driver}
                aria-controls={reviewId}
                aria-label={
                  driver
                    ? `Edit P${index + 1} ${driver.code}, ${driver.displayName}`
                    : `P${index + 1}, empty`
                }
                // Same 3px team bar as the pool card the pick came from, so
                // the order reads by team at a glance.
                className={`min-h-14 w-full rounded-sm border py-1.5 pr-2 text-left ${driver ? 'gpp-team-bar border-border-strong bg-surface-elevated pl-2.5 hover:bg-surface-hover' : 'border-dashed border-border pl-2'}`}
                style={
                  driver
                    ? ({
                        '--team-colour':
                          (driver.team && TEAM_COLORS[driver.team]) ||
                          FALLBACK_TEAM_COLOR,
                      } as CSSProperties)
                    : undefined
                }
              >
                <span className="sr-only">{driver?.displayName}</span>
                <span className="gpp-mono block text-xs text-text-muted">
                  P{index + 1}
                </span>
                <span
                  className={`gpp-mono mt-1 block text-sm ${driver ? 'text-text' : 'text-text-disabled'}`}
                >
                  <span aria-hidden="true">{driver?.code ?? '—'}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
