import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import { displayTeamName } from '@/lib/display';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { toUserFacingMessage } from '@/lib/userFacingError';

import { DuelDriverButton } from './H2HDuelPicker';
import type { H2HMatchup } from './H2HMatchupGrid';
import { PicksFocusOverlay } from './PicksFocusOverlay';

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

  async function pick(driverId: Id<'drivers'>) {
    if (!matchup || pending) {
      return;
    }
    setPending(driverId);
    setErrorMessage('');
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
        changed_pick: selectedDriverId !== driverId,
        source: 'dashboard',
      });
      navigator.vibrate?.(12);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? toUserFacingMessage(error)
          : 'Could not save that pick.',
      );
    } finally {
      setPending(null);
    }
  }

  if (!matchup) {
    return null;
  }

  return (
    <PicksFocusOverlay
      open={open}
      onClose={onClose}
      title={displayTeamName(matchup.team)}
      subtitle={`${SESSION_LABELS[sessionType]} only`}
      fillBody
    >
      {/* One question, so it takes the whole takeover rather than sitting in
          the top third of it. The two drivers are the screen on a phone: full
          width, stacked, each stretching to half the space left over, which is
          both the clearest way to read a duel and the biggest tap target we can
          give it. Desktop keeps them side by side, where the versus reads
          better and there is no empty space to fill. */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-4 sm:block sm:pb-0">
        {/* The team is already the modal's title; naming it again under it was
            the same word twice in the space of two lines. */}
        <h3 className="mb-3 text-center text-lg font-medium text-text sm:mb-4 sm:text-xl">
          Who finishes ahead?
        </h3>

        {/* Capped, then centred: stretched to a tall phone's full height each
            panel became a 490px box with a small island of driver floating in
            the middle of it. The cap keeps the panel a card; `justify-center`
            hands the leftover height back to the margins instead. */}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] sm:items-stretch sm:gap-3">
          <DuelDriverButton
            driver={matchup.driver1}
            selected={selectedDriverId === matchup.driver1._id}
            topFivePosition={topFivePositions?.[matchup.driver1._id]}
            onClick={() => void pick(matchup.driver1._id)}
            size="lg"
            className="max-h-72 min-h-0 flex-1 sm:max-h-none sm:flex-none"
          />
          {/* Hairlines on the phone, where the two panels sit above each other
              and "VS" alone in the gap reads as a stray label. */}
          <span
            className="gpp-mono flex shrink-0 items-center justify-center gap-3 text-xs font-semibold text-text-muted"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-border sm:hidden" />
            VS
            <span className="h-px flex-1 bg-border sm:hidden" />
          </span>
          <DuelDriverButton
            driver={matchup.driver2}
            selected={selectedDriverId === matchup.driver2._id}
            topFivePosition={topFivePositions?.[matchup.driver2._id]}
            onClick={() => void pick(matchup.driver2._id)}
            size="lg"
            className="max-h-72 min-h-0 flex-1 sm:max-h-none sm:flex-none"
          />
        </div>

        <p
          className="mt-3 min-h-5 shrink-0 text-center text-sm text-text-muted"
          aria-live="polite"
        >
          {errorMessage ? (
            <span className="text-error">{errorMessage}</span>
          ) : pending ? (
            'Saving…'
          ) : (
            'Tap a driver to save this battle.'
          )}
        </p>
      </div>
    </PicksFocusOverlay>
  );
}
