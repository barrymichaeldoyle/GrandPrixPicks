import { m } from 'framer-motion';
import type { CSSProperties } from 'react';

import { displayTeamName } from '@/lib/display';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import type { H2HDriver, H2HMatchup } from './H2HMatchupGrid';

/**
 * Every team-mate call at a glance: a team-coloured cell per battle showing the
 * driver you picked, or the battle number if you have not called it yet.
 *
 * It is both halves of the team-mate game's chrome. Inside the duel picker it
 * is progress ("which of the eleven am I on"); on a finished card it *is* the
 * card, because eleven codes in a compact grid are readable at a glance where
 * the full grid spends a screen on twenty-two names. Either way a cell is the
 * way back into a single battle, so the two surfaces share one component rather
 * than drifting apart.
 */
export function H2HPicksBar({
  matchups,
  selections,
  activeIndex = -1,
  onSelectIndex,
  ariaLabel = 'Team-mate battles',
  className = 'mt-2',
  testId = 'h2h-picks-bar',
}: {
  matchups: H2HMatchup[];
  selections: Record<string, H2HDriver['_id'] | undefined>;
  /** Cell currently being asked about, or -1 when nothing is. */
  activeIndex?: number;
  /** Omit to render a read-only bar (a locked session's saved calls). */
  onSelectIndex?: (index: number) => void;
  ariaLabel?: string;
  className?: string;
  testId?: string;
}) {
  const interactive = onSelectIndex !== undefined;

  // Eleven cells on one line is a desktop luxury. At 375px it left each cell
  // 27px wide, which truncated every three-letter code to "N…" and gave a
  // touch target half the width of a fingertip. Narrow screens get two rows of
  // six instead: the codes are legible and the cells are actually tappable,
  // which matters more here than the single unbroken line.
  const narrowColumns = Math.min(matchups.length, 6);

  return (
    <div
      className={`grid [grid-template-columns:repeat(var(--h2h-cols-narrow),minmax(0,1fr))] gap-1 sm:[grid-template-columns:repeat(var(--h2h-cols),minmax(0,1fr))] ${className}`}
      style={
        {
          '--h2h-cols-narrow': narrowColumns,
          '--h2h-cols': matchups.length,
        } as CSSProperties
      }
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {matchups.map((matchup, index) => {
        const selectedId = selections[matchup._id];
        const picked = [matchup.driver1, matchup.driver2].find(
          (driver) => driver._id === selectedId,
        );
        const isActive = index === activeIndex;
        const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;
        const label = `Battle ${index + 1} of ${matchups.length}, ${displayTeamName(
          matchup.team,
        )}. ${picked ? `${picked.displayName} picked` : 'Not called yet'}.`;

        const cellClassName = `gpp-team-bar flex h-9 min-w-0 items-center justify-center overflow-hidden rounded-sm border pr-1 pl-2 transition-colors sm:h-7 sm:pr-0.5 sm:pl-1.5 ${
          interactive
            ? 'focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none'
            : ''
        } ${
          isActive
            ? 'border-accent bg-surface-elevated'
            : picked
              ? `border-border bg-surface-elevated ${interactive ? 'hover:border-border-strong' : ''}`
              : `border-dashed border-border bg-page ${interactive ? 'hover:border-border-strong' : ''}`
        }`;

        // Re-keying on the code replays the settle, so a cell visibly takes the
        // driver's name the instant the call is made.
        const cellContent = (
          <m.span
            key={picked ? picked.code : 'open'}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`gpp-mono truncate text-xs leading-none sm:text-[10px] md:text-xs ${
              picked ? 'text-text' : 'text-text-muted'
            }`}
          >
            {picked ? picked.code : index + 1}
          </m.span>
        );

        if (!interactive) {
          return (
            <span
              key={matchup._id}
              aria-label={label}
              className={cellClassName}
              style={{ '--team-colour': teamColor } as CSSProperties}
            >
              {cellContent}
            </span>
          );
        }

        return (
          <button
            key={matchup._id}
            type="button"
            onClick={() => onSelectIndex(index)}
            aria-current={isActive ? 'step' : undefined}
            aria-label={label}
            className={cellClassName}
            style={{ '--team-colour': teamColor } as CSSProperties}
          >
            {cellContent}
          </button>
        );
      })}
    </div>
  );
}
