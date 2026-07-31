import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
}: {
  matchups: H2HMatchup[];
  selections: Record<string, H2HDriver['_id'] | undefined>;
  onSelect: (matchupId: H2HMatchup['_id'], driverId: H2HDriver['_id']) => void;
}) {
  const reduceMotion = useReducedMotion();
  const firstOpenIndex = (() => {
    const index = matchups.findIndex((matchup) => !selections[matchup._id]);
    return index === -1 ? Math.max(0, matchups.length - 1) : index;
  })();
  const [activeIndex, setActiveIndex] = useState(firstOpenIndex);
  const [advancing, setAdvancing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const selectedCount = matchups.filter(
    (matchup) => selections[matchup._id] !== undefined,
  ).length;
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

  // Drafts hydrate after the form's first render. Keep the visible duel in
  // sync with that restored progress instead of leaving a 5/11 or 11/11 draft
  // stranded on battle one. During a live pick, the short advance animation
  // owns this transition.
  useEffect(() => {
    if (advancing || matchups.length === 0) {
      return;
    }
    const activeMatchup = matchups[activeIndex];
    if (activeMatchup && selections[activeMatchup._id] === undefined) {
      return;
    }

    const nextOpenIndex = matchups.findIndex(
      (candidate) => selections[candidate._id] === undefined,
    );
    const nextIndex =
      nextOpenIndex === -1 ? matchups.length - 1 : nextOpenIndex;
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, advancing, matchups, selections]);

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
    setAdvancing(false);
  }

  function pick(driverId: H2HDriver['_id']) {
    if (!matchup || advancing) {
      return;
    }
    onSelect(matchup._id, driverId);
    navigator.vibrate?.(12);
    setAdvancing(true);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(
      () => goToNextOpenMatchup(matchup._id),
      reduceMotion ? 0 : ADVANCE_DELAY_MS,
    );
  }

  if (!matchup) {
    return null;
  }

  const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;

  return (
    <div className="mx-auto w-full max-w-3xl" data-testid="h2h-duel-picker">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="gpp-label text-text-muted">
            Teammate battle {activeIndex + 1} of {matchups.length}
          </p>
          <p
            className="gpp-mono text-sm text-text"
            aria-live="polite"
            data-testid="h2h-duel-progress"
          >
            {selectedCount}/{matchups.length}
          </p>
        </div>
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-surface-elevated"
          role="progressbar"
          aria-label="Teammate picks completed"
          aria-valuemin={0}
          aria-valuemax={matchups.length}
          aria-valuenow={selectedCount}
        >
          <motion.div
            className="h-full bg-accent"
            initial={false}
            animate={{
              width: `${(selectedCount / Math.max(matchups.length, 1)) * 100}%`,
            }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 34 }
            }
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={matchup._id}
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -28 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="rounded-xl border border-border bg-surface p-3 sm:p-5"
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
              disabled={advancing}
              onClick={() => pick(matchup.driver1._id)}
            />
            <span className="gpp-mono flex items-center justify-center text-xs font-semibold text-text-muted">
              VS
            </span>
            <DuelDriverButton
              driver={matchup.driver2}
              selected={selections[matchup._id] === matchup.driver2._id}
              disabled={advancing}
              onClick={() => pick(matchup.driver2._id)}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
        <Button
          variant="text"
          size="sm"
          leftIcon={ArrowLeft}
          disabled={activeIndex === 0 || advancing}
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
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
    </div>
  );
}

function DuelDriverButton({
  driver,
  selected,
  disabled,
  onClick,
}: {
  driver: H2HDriver;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const teamColor =
    (driver.team && TEAM_COLORS[driver.team]) ?? FALLBACK_TEAM_COLOR;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Pick ${driver.displayName}`}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      animate={selected ? { scale: [1, 1.025, 1] } : { scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`gpp-team-bar relative flex min-h-36 min-w-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border px-2 py-5 text-center transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none sm:min-h-44 sm:px-4 ${
        selected
          ? 'border-accent bg-accent-muted/25'
          : 'border-border bg-page hover:border-border-strong hover:bg-surface-elevated'
      }`}
      style={{ '--team-colour': teamColor } as CSSProperties}
    >
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
      <span
        className={`absolute right-2 bottom-2 inline-flex h-5 w-5 items-center justify-center rounded-full border ${
          selected
            ? 'border-accent bg-accent text-text-on-accent'
            : 'border-border text-transparent'
        }`}
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={3} />
      </span>
    </motion.button>
  );
}
