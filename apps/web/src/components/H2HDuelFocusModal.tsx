import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { colors } from '@grandprixpicks/shared/tokens';
import { useMutation } from 'convex/react';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import { displayTeamName } from '@/lib/display';
import { successHaptic, tapHaptic } from '@/lib/haptics';
import { prefersReducedMotion } from '@/lib/motion';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from './DriverBadge';
import { DUEL_CONFIRM_HOLD_MS, H2HDuelQuestion } from './H2HDuelQuestion';
import type { H2HMatchup } from './H2HMatchupGrid';
import { PicksFocusOverlay } from './PicksFocusOverlay';

/** Confetti draws to a canvas, so it needs a literal rather than a token class. */
const ACCENT_COLOR = colors.accent;

/**
 * One team-mate battle, on its own, saved the moment it is answered.
 *
 * A saved card is reviewed far more often than it is rebuilt, and the thing a
 * player comes back to change is almost always a single call. Reopening the
 * eleven-battle sequence to change one of them is the wrong shape for that, so
 * tapping a cell in the picks bar brings up exactly that duel: two drivers, one
 * question, no navigation. On mobile the overlay is a full-screen takeover,
 * which is what makes the two big driver buttons tappable at all.
 *
 * There is no Save button because there is nothing to compose: the pick *is*
 * the submit. It writes only this matchup, and only for `sessionType`, so
 * changing your Qualifying call cannot silently rewrite the Race card.
 */
export function H2HDuelFocusModal({
  open,
  onClose,
  raceId,
  sessionType,
  matchup,
  selectedDriverId,
  topFivePositions,
}: {
  open: boolean;
  onClose: () => void;
  raceId: Id<'races'>;
  /** Always explicit: a per-duel edit never cascades across the weekend. */
  sessionType: SessionType;
  matchup: H2HMatchup | null;
  selectedDriverId?: Id<'drivers'>;
  /** Top 5 slot (1-5) per driver, so the duel shows what you already called. */
  topFivePositions?: Record<string, number | undefined>;
}) {
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const [pending, setPending] = useState<Id<'drivers'> | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  // The tapped driver, shown as chosen before the server has agreed.
  //
  // Without this the takeover was the one place the pick animation never
  // played: `selectedDriverId` is the parent's saved state, so the card you
  // tapped stayed visually unpicked until a round trip completed, by which
  // point the overlay was closing. The panels answer the tap now, and the
  // write catches up behind them.
  const [optimisticDriverId, setOptimisticDriverId] =
    useState<Id<'drivers'> | null>(null);
  const shownDriverId = optimisticDriverId ?? selectedDriverId;

  // See `shownMatchup` below: this is only ever read on the way out.
  const [closingMatchup, setClosingMatchup] = useState<H2HMatchup | null>(
    matchup,
  );
  useEffect(() => {
    if (matchup) {
      setClosingMatchup(matchup);
    }
  }, [matchup]);

  // Reopening on another battle must not inherit the last one's answer.
  useEffect(() => {
    setOptimisticDriverId(null);
    setErrorMessage('');
    setSaved(false);
  }, [matchup?._id, open]);

  function celebrate() {
    if (import.meta.env.MODE === 'test' || prefersReducedMotion()) {
      return;
    }
    void import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        // Deliberately smaller than the burst for a completed card. This is
        // one battle of eleven: enough to land the save, not so much that
        // finishing the set feels like the same event.
        particleCount: 28,
        spread: 45,
        startVelocity: 26,
        scalar: 0.75,
        ticks: 90,
        origin: { y: 0.62 },
        colors: [teamColor, ACCENT_COLOR],
      });
    });
  }

  async function pick(driverId: Id<'drivers'>) {
    if (!matchup || pending) {
      return;
    }
    const isChange = selectedDriverId !== driverId;
    setPending(driverId);
    setOptimisticDriverId(driverId);
    setErrorMessage('');
    // Synchronously, inside the tap: iOS only produces a haptic while the
    // user gesture is still live, so anything after the await is Android-only.
    tapHaptic();
    try {
      await submitH2H({
        raceId,
        sessionType,
        picks: [{ matchupId: matchup._id, predictedWinnerId: driverId }],
      });
      captureAnalyticsEvent('h2h_duel_edited', {
        race_id: raceId,
        session_type: sessionType,
        team: matchup.team,
        changed_pick: isChange,
        source: 'dashboard',
      });
      successHaptic();
      setSaved(true);
      // Re-confirming the call you already had is not an achievement, and
      // confetti for it would cheapen the times it means something.
      if (isChange) {
        celebrate();
      }
      closeTimerRef.current = window.setTimeout(
        onClose,
        prefersReducedMotion() ? 0 : DUEL_CONFIRM_HOLD_MS,
      );
    } catch (error) {
      // The card has to go back to what is actually saved: leaving the tapped
      // driver looking chosen next to an error message tells two stories.
      setOptimisticDriverId(null);
      setSaved(false);
      setErrorMessage(
        error instanceof Error
          ? toUserFacingMessage(
              error,
              'Your Head-to-Head pick wasn’t saved. Try again.',
            )
          : 'Your Head-to-Head pick wasn’t saved. Try again.',
      );
    } finally {
      setPending(null);
    }
  }

  // The last battle stays rendered while the takeover animates out. The
  // dashboard clears its active duel the moment close is asked for, and
  // rendering nothing from that frame is what made the overlay blink out of
  // existence rather than leave: there was no content left to animate.
  const shownMatchup = matchup ?? closingMatchup;
  if (!shownMatchup) {
    return null;
  }

  const teamColor = TEAM_COLORS[shownMatchup.team] ?? FALLBACK_TEAM_COLOR;

  return (
    <PicksFocusOverlay
      open={open}
      onClose={onClose}
      title={
        // The team's colour, where the team is named. It is the fastest way to
        // know which battle you opened — you recognise papaya or Ferrari red
        // before you have read the word — and the duel card in the eleven-step
        // sequence already leads with the same dot, so the two surfaces now
        // introduce a battle the same way.
        <span className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: teamColor }}
            aria-hidden="true"
          />
          {displayTeamName(shownMatchup.team)}
        </span>
      }
      subtitle={`${SESSION_LABELS[sessionType]} only`}
      fillBody
    >
      {/* One question, so it takes the whole takeover rather than sitting in
          the top third of it. `H2HDuelQuestion` is the same question the
          landing page asks in its eleven-battle sequence, in its takeover
          layout: the drivers stack on a phone and go side by side from `sm`.
          The team is already the modal's title, so it is not repeated here. */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-4 sm:block sm:pb-0">
        <H2HDuelQuestion
          matchup={shownMatchup}
          selectedDriverId={shownDriverId}
          topFivePositions={topFivePositions}
          onPick={(driverId) => void pick(driverId)}
          variant="takeover"
          status={
            errorMessage ? (
              <span className="text-error">{errorMessage}</span>
            ) : saved ? (
              // The one thing worth saying during the hold before the takeover
              // closes. Without it the caption went back to inviting a tap on a
              // card that had just been answered.
              <span className="inline-flex items-center gap-1.5 text-accent">
                <Check size={14} strokeWidth={3} aria-hidden="true" />
                Saved
              </span>
            ) : pending ? (
              'Saving…'
            ) : (
              'Tap a driver to save this battle.'
            )
          }
        />
      </div>
    </PicksFocusOverlay>
  );
}
