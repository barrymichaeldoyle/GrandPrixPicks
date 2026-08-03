import { m, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Swords } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { Button } from './Button/Button';
import { DriverBadge, FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import type { H2HDriver, H2HMatchup } from './H2HMatchupGrid';

const ADVANCE_DELAY_MS = 280;

export function H2HDuelPicker({
  matchups,
  selections,
  onSelect,
  draftHydrated = true,
  topFivePositions,
}: {
  matchups: H2HMatchup[];
  selections: Record<string, H2HDriver['_id'] | undefined>;
  onSelect: (matchupId: H2HMatchup['_id'], driverId: H2HDriver['_id']) => void;
  /**
   * Whether the parent has finished restoring any device draft. The picker
   * catches up to that restored progress exactly once; after that the player
   * owns which battle is on screen.
   */
  draftHydrated?: boolean;
  /** Top 5 slot (1-5) per driver, so a duel can show what you already called. */
  topFivePositions?: Record<string, number | undefined>;
}) {
  const reduceMotion = useReducedMotion();
  const firstOpenIndex = (() => {
    const index = matchups.findIndex((matchup) => !selections[matchup._id]);
    return index === -1 ? Math.max(0, matchups.length - 1) : index;
  })();
  const [activeIndex, setActiveIndex] = useState(firstOpenIndex);
  /**
   * Whether a completed card is open on a single battle for editing.
   *
   * Once all eleven are called there is nothing left to ask, so the duel card
   * folds away and the strip alone is the prediction card: eleven codes, one
   * line, readable at a glance instead of a wall of twenty-two names. Tapping a
   * cell brings that one battle back; answering it folds the card away again.
   */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const syncedToDraftRef = useRef(false);

  const selectedCount = matchups.filter(
    (matchup) => selections[matchup._id] !== undefined,
  ).length;
  const previousSelectedCountRef = useRef(selectedCount);
  const complete = matchups.length > 0 && selectedCount === matchups.length;
  const matchup = matchups[activeIndex];

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  // Drafts hydrate after the form's first render, so a 5/11 or 11/11 draft
  // would otherwise sit stranded on battle one. This catches up once and then
  // gets out of the way: it used to re-run on every index change, which meant
  // Previous bounced straight back to the furthest open battle and nobody
  // could look at a call they had already made.
  useEffect(() => {
    if (!draftHydrated || syncedToDraftRef.current || matchups.length === 0) {
      return;
    }
    syncedToDraftRef.current = true;
    setActiveIndex(firstOpenIndex);
  }, [draftHydrated, firstOpenIndex, matchups.length]);

  // Discarding a restored draft empties the grid, so start the sequence over.
  useEffect(() => {
    if (previousSelectedCountRef.current > 0 && selectedCount === 0) {
      setActiveIndex(0);
    }
    previousSelectedCountRef.current = selectedCount;
  }, [selectedCount]);

  function cancelPendingAdvance() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Deliberate navigation always wins over a queued auto-advance. */
  function goTo(index: number) {
    cancelPendingAdvance();
    const next = Math.min(Math.max(index, 0), matchups.length - 1);
    setActiveIndex(next);
    setEditingIndex(next);
  }

  function goToNextOpenMatchup(selectedMatchupId: H2HMatchup['_id']) {
    const nextAfterCurrent = matchups.findIndex(
      (candidate, index) =>
        index > activeIndex &&
        candidate._id !== selectedMatchupId &&
        selections[candidate._id] === undefined,
    );
    const nextAnywhere = matchups.findIndex(
      (candidate) =>
        candidate._id !== selectedMatchupId &&
        selections[candidate._id] === undefined,
    );
    const nextIndex =
      nextAfterCurrent !== -1
        ? nextAfterCurrent
        : nextAnywhere !== -1
          ? nextAnywhere
          : Math.min(activeIndex + 1, matchups.length - 1);

    setActiveIndex(nextIndex);
  }

  function pick(driverId: H2HDriver['_id']) {
    if (!matchup) {
      return;
    }
    // The advance window used to disable both drivers, so a fast tapper (or
    // anyone changing their mind inside 280ms) had the tap swallowed with no
    // feedback at all. Re-picking now just re-arms the advance.
    onSelect(matchup._id, driverId);
    navigator.vibrate?.(12);

    cancelPendingAdvance();
    // Changing a call on a finished card has nowhere to advance to, so the
    // same beat that would move to the next battle folds this one away.
    const answered = matchups.every(
      (candidate) =>
        candidate._id === matchup._id ||
        selections[candidate._id] !== undefined,
    );
    timerRef.current = window.setTimeout(
      () =>
        answered ? setEditingIndex(null) : goToNextOpenMatchup(matchup._id),
      reduceMotion ? 0 : ADVANCE_DELAY_MS,
    );
  }

  if (!matchup) {
    return null;
  }

  const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;

  const collapsed = complete && editingIndex === null;

  return (
    <div className="mx-auto w-full max-w-3xl" data-testid="h2h-duel-picker">
      <div className={collapsed ? '' : 'mb-4'}>
        {/* One progress mechanism, not three. This label and the strip under it
            already say where you are; the "n/11" counter that used to sit
            opposite restated both, and on a finished card "11/11" restated
            "All battles called" a third time. */}
        <div className="flex items-center justify-between gap-3">
          <p
            className="gpp-label flex items-center gap-1.5 text-text-muted"
            aria-live="polite"
            data-testid="h2h-duel-progress"
          >
            {collapsed ? (
              <>
                <Check size={14} className="text-accent" aria-hidden="true" />
                All battles called
              </>
            ) : (
              `Team-mate battle ${activeIndex + 1} of ${matchups.length}`
            )}
          </p>
          {/* The "tap a battle to change your mind" hint used to sit under the
              strip in the same shouty label style as the status above it, so a
              finished card spent three lines of chrome on eleven cells. It is a
              hint, not a heading: quiet, and on the row it belongs to. */}
          {collapsed ? (
            <p className="text-xs text-text-muted">Tap one to change it</p>
          ) : null}
        </div>
        <DuelProgressStrip
          matchups={matchups}
          selections={selections}
          activeIndex={collapsed ? -1 : activeIndex}
          onJump={goTo}
        />
      </div>

      {collapsed ? null : (
        <>
          {/* Stable chrome, animated contents. Sliding the whole card made each
          pick feel like a carousel page; the frame stays put and the next
          duel pops in. No exit animation — `AnimatePresence mode="wait"`
          used to hold the outgoing duel until its exit finished, so the
          header counter and the card on screen disagreed for the length of
          the transition. */}
          <div className="rounded-xl border border-border bg-surface p-3 sm:p-5">
            <m.div
              key={matchup._id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 520, damping: 32, mass: 0.8 }
              }
              style={{ transformOrigin: '50% 40%' }}
            >
              <div className="mb-4 text-center">
                <p className="gpp-label flex items-center justify-center gap-2 text-text-muted">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: teamColor }}
                    aria-hidden="true"
                  />
                  {displayTeamName(matchup.team)}
                </p>
                <h3 className="mt-2 text-xl font-medium text-text">
                  Who finishes ahead?
                </h3>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] sm:gap-3">
                <DuelDriverButton
                  driver={matchup.driver1}
                  selected={selections[matchup._id] === matchup.driver1._id}
                  topFivePosition={topFivePositions?.[matchup.driver1._id]}
                  onClick={() => pick(matchup.driver1._id)}
                />
                <span className="gpp-mono flex items-center justify-center text-xs font-semibold text-text-muted">
                  VS
                </span>
                <DuelDriverButton
                  driver={matchup.driver2}
                  selected={selections[matchup._id] === matchup.driver2._id}
                  topFivePosition={topFivePositions?.[matchup.driver2._id]}
                  onClick={() => pick(matchup.driver2._id)}
                />
              </div>
            </m.div>
          </div>

          <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
            <Button
              variant="text"
              size="sm"
              leftIcon={ArrowLeft}
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center gap-1.5 text-sm text-text-muted">
              {complete ? (
                <>
                  <Check size={14} className="text-accent" aria-hidden="true" />
                  All battles called
                </>
              ) : (
                <>
                  <Swords size={14} aria-hidden="true" />
                  Pick one to continue
                </>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Progress and review in one control. It replaces the plain progress bar: the
 * bar could only say how many were done, this says which, by whom, and lets
 * you go back and look. Eleven cells fit a 320px viewport without scrolling.
 *
 * Once every battle is called it stops being progress and becomes the card
 * itself, so `activeIndex` of -1 means "nothing is being asked right now".
 */
function DuelProgressStrip({
  matchups,
  selections,
  activeIndex,
  onJump,
}: {
  matchups: H2HMatchup[];
  selections: Record<string, H2HDriver['_id'] | undefined>;
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <div
      className="mt-2 grid gap-0.5 sm:gap-1"
      style={{
        gridTemplateColumns: `repeat(${matchups.length}, minmax(0, 1fr))`,
      }}
      role="group"
      aria-label="Team-mate battles"
      data-testid="h2h-duel-strip"
    >
      {matchups.map((matchup, index) => {
        const selectedId = selections[matchup._id];
        const picked = [matchup.driver1, matchup.driver2].find(
          (driver) => driver._id === selectedId,
        );
        const isActive = index === activeIndex;
        const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;

        return (
          <button
            key={matchup._id}
            type="button"
            onClick={() => onJump(index)}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Battle ${index + 1} of ${matchups.length}, ${displayTeamName(
              matchup.team,
            )}. ${picked ? `${picked.displayName} picked` : 'Not called yet'}.`}
            className={`gpp-team-bar flex h-7 min-w-0 items-center justify-center overflow-hidden rounded-sm border pr-0.5 pl-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none ${
              isActive
                ? 'border-accent bg-surface-elevated'
                : picked
                  ? 'border-border bg-surface-elevated hover:border-border-strong'
                  : 'border-dashed border-border bg-page hover:border-border-strong'
            }`}
            style={{ '--team-colour': teamColor } as CSSProperties}
          >
            {/* Re-keying on the code replays the settle, so a cell visibly
                takes the driver's name the instant the call is made. */}
            <m.span
              key={picked ? picked.code : 'open'}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`gpp-mono truncate text-[10px] leading-none sm:text-xs ${
                picked ? 'text-text' : 'text-text-muted'
              }`}
            >
              {picked ? picked.code : index + 1}
            </m.span>
          </button>
        );
      })}
    </div>
  );
}

function DuelDriverButton({
  driver,
  selected,
  topFivePosition,
  onClick,
}: {
  driver: H2HDriver;
  selected: boolean;
  topFivePosition?: number;
  onClick: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const teamColor =
    (driver.team && TEAM_COLORS[driver.team]) ?? FALLBACK_TEAM_COLOR;

  /*
   * Hover does not move the card. Lifting it was generic (every SaaS card in
   * existence does it) and it fought the flat surface this system is built on,
   * where depth is a lighter surface plus a hairline and nothing floats. Hover
   * is that surface step, full stop.
   *
   * The reward is spent on the pick instead, where it is earned and where it
   * only fires eleven times: an accent beam crosses the card like a car
   * tripping a timing loop, and the confirm badge snaps in behind it.
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
      }`}
      style={{ '--team-colour': teamColor } as CSSProperties}
    >
      {sweepId > 0 && !reduceMotion ? (
        <m.span
          key={sweepId}
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent"
          initial={{ left: '0%', opacity: 1 }}
          animate={{ left: '100%', opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
        />
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
        prerenderTooltip={false}
      />
      <span className="min-w-0">
        <span className="block text-base leading-tight font-medium text-text sm:text-lg">
          {driver.displayName}
        </span>
        {driver.number != null ? (
          <span className="gpp-mono mt-1 block text-sm text-text-muted">
            #{driver.number}
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
        transition={{ type: 'spring', stiffness: 620, damping: 18 }}
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={3} />
      </m.span>
    </button>
  );
}
