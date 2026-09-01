import { m, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Swords } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { displayTeamName } from '@/lib/display';
import { tapHaptic } from '@/lib/haptics';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';

import { Button } from './Button/Button';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import type { H2HDriver, H2HMatchup } from './H2HMatchupGrid';
import { H2HPicksBar } from './H2HPicksBar';
import { DUEL_CONFIRM_HOLD_MS, H2HDuelQuestion } from './H2HDuelQuestion';
import { PicksFocusOverlay } from './PicksFocusOverlay';

/**
 * How long the answered duel stays on screen before the next one replaces it.
 *
 * Long enough to see the pick land: the accent line takes about 460ms to run
 * the card's perimeter and the check badge lands with it, and an animation
 * nobody ever watches finish is one there is no point paying for. Short enough
 * that eleven battles still feel like a rhythm rather than a queue.
 */
const ADVANCE_DELAY_MS = 420;

export function H2HDuelPicker({
  matchups,
  selections,
  onSelect,
  draftHydrated = true,
  topFivePositions,
  onExitPrevious,
  collapsedEdit = 'inline',
  sessionType,
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
  /**
   * When on the first battle, Previous can leave the duel sequence (e.g. back
   * to Top 5 in a two-step funnel). Without this, Previous stays disabled.
   */
  onExitPrevious?: () => void;
  /**
   * How reopening one battle from a *finished* card is presented.
   *
   * `inline` reopens the duel under the strip, which grows the card and pushes
   * everything below it (including the submit button) down the page. That is
   * fine mid-sequence, where the card is the only thing on screen, but on a
   * completed prediction card it shoves content around under the reader's
   * thumb. `modal` puts that one battle in the same focused takeover a
   * signed-in player gets from their dashboard, so the card underneath stays
   * exactly where it was. Mid-sequence presentation is unaffected either way.
   */
  collapsedEdit?: 'inline' | 'modal';
  /** Names the session in the takeover subtitle, so an edit says what it edits. */
  sessionType?: SessionType;
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
  /** Confirms the answer during the hold before the takeover closes. */
  const [justSaved, setJustSaved] = useState(false);
  const timerRef = useRef<number | null>(null);
  const syncedToDraftRef = useRef(false);
  const duelCardRef = useRef<HTMLDivElement>(null);
  const shouldFocusDuelRef = useRef(false);

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
    setJustSaved(false);
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

    shouldFocusDuelRef.current = true;
    setActiveIndex(nextIndex);
  }

  function focusActiveDuel() {
    window.requestAnimationFrame(() => {
      duelCardRef.current
        ?.querySelector<HTMLButtonElement>('button[aria-label^="Pick "]')
        ?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    if (!shouldFocusDuelRef.current) {
      return;
    }
    // Consume the request either way. A finished card has no duel to focus,
    // and leaving the flag set would fire this move later, on a render the
    // user never asked to be pulled into.
    shouldFocusDuelRef.current = false;
    const finishedCard =
      (complete && editingIndex === null) ||
      (collapsedEdit === 'modal' && complete && editingIndex !== null);
    if (finishedCard) {
      return;
    }
    focusActiveDuel();
  }, [activeIndex, collapsedEdit, complete, editingIndex]);

  function pick(driverId: H2HDriver['_id']) {
    if (!matchup) {
      return;
    }
    // The advance window used to disable both drivers, so a fast tapper (or
    // anyone changing their mind inside 280ms) had the tap swallowed with no
    // feedback at all. Re-picking now just re-arms the advance.
    onSelect(matchup._id, driverId);
    tapHaptic();

    cancelPendingAdvance();
    // Changing a call on a finished card has nowhere to advance to, so the
    // same beat that would move to the next battle folds this one away.
    const answered = matchups.every(
      (candidate) =>
        candidate._id === matchup._id ||
        selections[candidate._id] !== undefined,
    );
    setJustSaved(answered);
    timerRef.current = window.setTimeout(
      () =>
        answered ? setEditingIndex(null) : goToNextOpenMatchup(matchup._id),
      // A takeover closing is a bigger event than a card advancing, and it is
      // the only one that has to show its own answer before it goes: the
      // sequence hands you the next battle, the takeover hands you nothing.
      reduceMotion ? 0 : modalEdit ? DUEL_CONFIRM_HOLD_MS : ADVANCE_DELAY_MS,
    );
  }

  if (!matchup) {
    return null;
  }

  const teamColor = TEAM_COLORS[matchup.team] ?? FALLBACK_TEAM_COLOR;

  const collapsed = complete && editingIndex === null;
  /**
   * Reopening one battle from a finished card, presented as a takeover.
   *
   * Mutually exclusive with `collapsed` (that is the same card with nothing
   * open). While it is true the card underneath must keep reading as finished:
   * the takeover is over the top, so the strip has not gone back to being a
   * sequence and its chrome should not say it has.
   */
  const modalEdit =
    collapsedEdit === 'modal' && complete && editingIndex !== null;
  const showFinishedCard = collapsed || modalEdit;

  const duelCard = (
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
      // In the takeover the card *is* the screen, so it stretches and the
      // question lays itself out for that; inline it stays a card in a page.
      className={modalEdit ? 'flex min-h-0 flex-1 flex-col pb-4 sm:block' : ''}
    >
      <H2HDuelQuestion
        matchup={matchup}
        selectedDriverId={selections[matchup._id]}
        topFivePositions={topFivePositions}
        onPick={pick}
        variant={modalEdit ? 'takeover' : 'inline'}
        // The takeover's own title already carries the team dot and name.
        showTeam={!modalEdit}
        // Only in the takeover: mid-sequence the row under the card already
        // says where you are and what to do, and the dashboard's duel modal
        // says exactly this in exactly this place.
        status={
          modalEdit ? (
            justSaved ? (
              <span className="inline-flex items-center gap-1.5 text-accent">
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                Saved
              </span>
            ) : (
              'Tap a driver to save this battle.'
            )
          ) : undefined
        }
      />
    </m.div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl" data-testid="h2h-duel-picker">
      <div className={showFinishedCard ? '' : 'mb-4'}>
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
            {showFinishedCard ? (
              <>
                <Check size={14} className="text-accent" aria-hidden="true" />
                All team-mate picks made
              </>
            ) : (
              `Team-mate pick ${activeIndex + 1} of ${matchups.length}`
            )}
          </p>
          {/* The "tap a battle to change your mind" hint used to sit under the
              strip in the same shouty label style as the status above it, so a
              finished card spent three lines of chrome on eleven cells. It is a
              hint, not a heading: quiet, and on the row it belongs to. */}
          {showFinishedCard ? (
            <p className="text-xs text-text-muted">Tap one to change it</p>
          ) : null}
        </div>
        <H2HPicksBar
          matchups={matchups}
          selections={selections}
          activeIndex={collapsed ? -1 : activeIndex}
          onSelectIndex={goTo}
          testId="h2h-duel-strip"
        />
      </div>

      {showFinishedCard ? null : (
        <>
          {/* Stable chrome, animated contents. Sliding the whole card made each
          pick feel like a carousel page; the frame stays put and the next
          duel pops in. No exit animation — `AnimatePresence mode="wait"`
          used to hold the outgoing duel until its exit finished, so the
          header counter and the card on screen disagreed for the length of
          the transition. */}
          <div
            ref={duelCardRef}
            className="rounded-xl border border-border bg-surface p-3 sm:p-5"
          >
            {duelCard}
          </div>

          <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
            <Button
              variant="text"
              size="sm"
              className="[&_svg]:translate-y-px"
              leftIcon={ArrowLeft}
              disabled={activeIndex === 0 && !onExitPrevious}
              onClick={() => {
                if (activeIndex === 0) {
                  onExitPrevious?.();
                  return;
                }
                goTo(activeIndex - 1);
              }}
            >
              Previous
            </Button>
            <span className="flex items-center gap-1.5 text-sm text-text-muted">
              {complete ? (
                <>
                  <Check size={14} className="text-accent" aria-hidden="true" />
                  All team-mate picks made
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

      {/* One battle, over the top of the finished card, so changing a call
          never moves the card or the submit button under the reader's thumb.
          Deliberately the same overlay a signed-in player gets from their
          dashboard: the difference between the two is only where the answer is
          written (a device draft here, Convex there), which is not something
          the interface should express. There is no Save button because the
          pick is the submit, and no Previous/Next because this is one battle
          rather than a sequence. */}
      {collapsedEdit === 'modal' ? (
        <PicksFocusOverlay
          open={modalEdit}
          onClose={() => setEditingIndex(null)}
          title={
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: teamColor }}
                aria-hidden="true"
              />
              {displayTeamName(matchup.team)}
            </span>
          }
          subtitle={
            sessionType ? `${SESSION_LABELS[sessionType]} only` : undefined
          }
          fillBody
        >
          {duelCard}
        </PicksFocusOverlay>
      ) : null}
    </div>
  );
}
