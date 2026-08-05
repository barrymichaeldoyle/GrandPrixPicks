import { m, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { DriverBadge, FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import { Flag } from './Flag';
import type { H2HDriver, H2HMatchup } from './H2HMatchupGrid';

/**
 * How long an answered duel holds before the surface that asked it moves on.
 *
 * The pick animation (the accent line running the card's perimeter, then the
 * check landing as it closes) takes about 500ms, and closing under it made a
 * decision that had just been made end in a blink. Shared so the takeover
 * closes on the same beat wherever it was opened from.
 */
export const DUEL_CONFIRM_HOLD_MS = 620;

/**
 * One team-mate battle, asked the same way everywhere it is asked.
 *
 * There are two places a duel gets put to a player: the eleven-step sequence on
 * the landing page and the single-battle takeover a signed-in player opens from
 * their dashboard. Both used to build the question themselves, which is how one
 * of them ended up stacking the drivers on a phone and the other did not. They
 * differ by `variant` now and nothing else, so a change to how a duel reads
 * lands on both surfaces by default.
 *
 * - `inline` — a card inside a page: drivers side by side at every width, since
 *   the card is one step of many and the chrome around it needs the room.
 * - `takeover` — the duel owns the screen: on a phone the two drivers go under
 *   each other at full width, which is both how a duel reads and the biggest
 *   tap target we can give it. From `sm` they are side by side again, where the
 *   versus reads better and there is no empty height to fill.
 */
export function H2HDuelQuestion({
  matchup,
  selectedDriverId,
  topFivePositions,
  onPick,
  variant = 'inline',
  showTeam = false,
  status,
}: {
  matchup: H2HMatchup;
  selectedDriverId?: H2HDriver['_id'];
  /** Top 5 slot (1-5) per driver, so the duel shows what you already called. */
  topFivePositions?: Record<string, number | undefined>;
  onPick: (driverId: H2HDriver['_id']) => void;
  variant?: 'inline' | 'takeover';
  /**
   * Name the team above the question. The takeover's own title already carries
   * the team dot and name, so repeating it there would head one card twice.
   */
  showTeam?: boolean;
  /**
   * What the duel says about itself under the panels: the invitation to tap,
   * and what happened when you did. Owned by the caller because saving means a
   * different thing on each surface (a device draft on the landing page, a
   * Convex write from the dashboard) and said in one place because a player
   * should not be able to tell those apart.
   */
  status?: ReactNode;
}) {
  const isTakeover = variant === 'takeover';
  const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;

  return (
    <div className={isTakeover ? 'flex min-h-0 flex-1 flex-col' : ''}>
      <div className="mb-4 shrink-0 text-center">
        {showTeam ? (
          <p className="gpp-label flex items-center justify-center gap-2 text-text-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: teamColor }}
              aria-hidden="true"
            />
            {displayTeamName(matchup.team)}
          </p>
        ) : null}
        <h3
          className={`text-xl font-medium text-text ${showTeam ? 'mt-2' : ''}`}
        >
          Who finishes ahead?
        </h3>
      </div>

      {/* Capped, then centred, in the takeover: stretched to a tall phone's
          full height each panel became a box with a small island of driver
          floating in the middle of it. The cap keeps the panel a card and
          `justify-center` hands the leftover height back to the margins. */}
      <div
        className={
          isTakeover
            ? 'flex min-h-0 flex-1 flex-col justify-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] sm:items-stretch sm:gap-3'
            : 'grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] sm:gap-3'
        }
      >
        <DuelDriverButton
          driver={matchup.driver1}
          selected={selectedDriverId === matchup.driver1._id}
          topFivePosition={topFivePositions?.[matchup.driver1._id]}
          onClick={() => onPick(matchup.driver1._id)}
          size={isTakeover ? 'lg' : 'md'}
          className={
            isTakeover
              ? 'max-h-72 min-h-0 flex-1 sm:max-h-none sm:flex-none'
              : ''
          }
        />
        {/* Hairlines only where the two panels sit above each other, and "VS"
            alone in the gap would read as a stray label. */}
        <span
          className="gpp-mono flex shrink-0 items-center justify-center gap-3 text-xs font-semibold text-text-muted"
          aria-hidden="true"
        >
          {isTakeover ? (
            <span className="h-px flex-1 bg-border sm:hidden" />
          ) : null}
          VS
          {isTakeover ? (
            <span className="h-px flex-1 bg-border sm:hidden" />
          ) : null}
        </span>
        <DuelDriverButton
          driver={matchup.driver2}
          selected={selectedDriverId === matchup.driver2._id}
          topFivePosition={topFivePositions?.[matchup.driver2._id]}
          onClick={() => onPick(matchup.driver2._id)}
          size={isTakeover ? 'lg' : 'md'}
          className={
            isTakeover
              ? 'max-h-72 min-h-0 flex-1 sm:max-h-none sm:flex-none'
              : ''
          }
        />
      </div>

      {status !== undefined ? (
        <p
          className="mt-3 min-h-5 shrink-0 text-center text-sm text-text-muted"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One side of a duel. Not exported: both surfaces that ask a duel go through
 * `H2HDuelQuestion` above, and that is the point — a panel reachable on its own
 * is how the two places drifted apart in the first place.
 */
function DuelDriverButton({
  driver,
  selected,
  topFivePosition,
  onClick,
  className = '',
  size = 'md',
}: {
  driver: H2HDriver;
  selected: boolean;
  topFivePosition?: number;
  onClick: () => void;
  /** Lets a caller size the panel, e.g. stretch it to fill a takeover. */
  className?: string;
  /**
   * `lg` for a panel that owns the screen (the single-duel takeover), where
   * the default type left the driver as a small island in a tall card. The
   * eleven-battle sequence keeps `md`: there the card is one step of many and
   * the surrounding chrome needs the room.
   */
  size?: 'md' | 'lg';
}) {
  const reduceMotion = useReducedMotion();
  const isLarge = size === 'lg';
  const teamColor =
    (driver.team && TEAM_COLORS[driver.team]) ?? FALLBACK_TEAM_COLOR;

  /*
   * Hover does not move the card. Lifting it was generic (every SaaS card in
   * existence does it) and it fought the flat surface this system is built on,
   * where depth is a lighter surface plus a hairline and nothing floats. Hover
   * is that surface step, full stop.
   *
   * The reward is spent on the pick instead, where it is earned and where it
   * only fires eleven times: the card lights up and an accent line runs the
   * whole way round it, closing on itself at the corner it started from, and
   * the confirm badge lands as it closes.
   *
   * It used to be a beam crossing left to right, which had the problem every
   * sweep has: it passes over the card and leaves, so the moment reads as
   * something happening *to* the card rather than the card becoming yours. The
   * line finishing on the card's own edge is the same accent border the picked
   * state holds afterwards, so the animation resolves into the result instead
   * of exiting off the other side of it.
   */
  const [sweepId, setSweepId] = useState(0);
  const wasSelectedRef = useRef(selected);
  useEffect(() => {
    if (selected && !wasSelectedRef.current) {
      setSweepId((id) => id + 1);
    }
    wasSelectedRef.current = selected;
  }, [selected]);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Pick ${driver.displayName}${
        topFivePosition ? `, your P${topFivePosition}` : ''
      }`}
      onClick={onClick}
      className={`gpp-team-bar relative flex min-h-36 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border px-2 py-5 text-center transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none sm:min-h-44 sm:px-4 ${
        selected
          ? 'border-accent bg-accent-muted/25'
          : 'border-border bg-page hover:border-border-strong hover:bg-surface-elevated'
      } ${className}`}
      style={{ '--team-colour': teamColor } as CSSProperties}
    >
      {sweepId > 0 && !reduceMotion ? (
        <Fragment key={sweepId}>
          {/* The card lights up first: one quick accent bloom over the whole
              panel, gone by the time the line is halfway round. */}
          <m.span
            className="pointer-events-none absolute inset-0 bg-accent"
            initial={{ opacity: 0.22 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            aria-hidden="true"
          />
          {/* Then the lap: the stroke is drawn on with `pathLength`, which
              normalises the perimeter to 1 so one duration covers a short
              panel in the sequence and a tall one in the takeover alike. Half
              the width is clipped by the button's own `overflow-hidden`, so it
              runs along the border it is about to become.

              It fades once it closes, and that fade is the whole point: the
              trace is twice the border's weight, so leaving it drawn left the
              picked card carrying a heavier edge than the card next to it —
              which read as the border thickening on click. It hands the edge
              back to the real `border-accent` and disappears. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <m.rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              rx="8"
              fill="none"
              className="stroke-accent"
              strokeWidth="4"
              pathLength={1}
              strokeDasharray="1 1"
              initial={{ strokeDashoffset: 1, opacity: 1 }}
              animate={{ strokeDashoffset: 0, opacity: [1, 1, 0] }}
              transition={{
                strokeDashoffset: { duration: 0.46, ease: [0.33, 1, 0.68, 1] },
                opacity: { duration: 0.68, times: [0, 0.68, 1] },
              }}
            />
          </svg>
        </Fragment>
      ) : null}
      {/* The one place the two games talk to each other: if you already put
          this driver in your Top 5, the duel should not make you remember. */}
      {topFivePosition ? (
        <span className="gpp-mono absolute top-2 left-2 rounded-sm border border-accent/40 px-1 py-0.5 text-[10px] leading-none text-accent">
          YOUR P{topFivePosition}
        </span>
      ) : null}
      <DriverBadge
        code={driver.code}
        team={driver.team}
        displayName={driver.displayName}
        number={driver.number}
        nationality={driver.nationality}
        size={isLarge ? 'lg' : 'md'}
        prerenderTooltip={false}
      />
      <span className="min-w-0">
        <span
          className={`block leading-tight font-medium text-text ${
            isLarge ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          }`}
        >
          {driver.displayName}
        </span>
        {/* Flag on the number line rather than beside the code. Next to the
            badge it made a two-part plate that read as one wide object and
            crowded the code; the number is the other identity fact, it is short
            enough that a flag beside it can never wrap, and the two together
            make one quiet line under the name. */}
        {driver.nationality || driver.number != null ? (
          <span
            className={`gpp-mono mt-1 flex items-center justify-center gap-1.5 text-text-muted ${
              isLarge ? 'text-base' : 'text-sm'
            }`}
          >
            {driver.nationality ? (
              <Flag code={driver.nationality} size={isLarge ? 'md' : 'sm'} />
            ) : null}
            {driver.number != null ? <span>#{driver.number}</span> : null}
          </span>
        ) : null}
      </span>
      <m.span
        className={`absolute right-2 bottom-2 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
          selected
            ? 'border-accent bg-accent text-text-on-accent'
            : 'border-border text-transparent'
        }`}
        animate={selected && !reduceMotion ? { scale: [0.4, 1] } : { scale: 1 }}
        // Held back so it lands as the line closes rather than during it: two
        // things arriving at once was the pick reading as a flicker.
        transition={{
          type: 'spring',
          stiffness: 620,
          damping: 18,
          delay: reduceMotion ? 0 : 0.3,
        }}
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={3} />
      </m.span>
    </button>
  );
}
