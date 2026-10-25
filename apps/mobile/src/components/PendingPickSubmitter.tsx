import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useConvex, useConvexAuth, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useEffect, useRef } from 'react';

import {
  clearConnectedDraft,
  listPendingDrafts,
  patchConnectedDraft,
} from '../lib/picksDrafts';
import { useToast } from '../providers/ToastProvider';

/**
 * Submits the picks somebody made before they had an account.
 *
 * Mobile lets a signed-out visitor build a full card, which is only worth
 * doing if the card survives the sign-in. It is stored on the device as they
 * edit; this drains it once Convex has an authenticated identity, which is
 * later than Clerk saying "signed in" and is the moment a mutation will
 * actually be accepted.
 *
 * Mirrors the web's `PendingPickSubmitter`, including why it lives at the root
 * rather than in the form: signing in swaps enough of the tree that a form's
 * own effect cannot be relied on to still be mounted when auth lands.
 *
 * A guest's card is a cascade: "one card covers every open session" is what
 * the editor told them, so it is submitted without a session and the server
 * writes it to every session still open. Sending it under the session the
 * draft happens to be filed under put the picks on the race alone and left
 * qualifying empty.
 *
 * A draft for a session that has since locked will be rejected by the server,
 * which is the correct outcome. It is cleared so it cannot sit there being
 * retried forever, and the reader is told rather than left to discover an
 * empty card. A Top 5 still short of five drivers is not sent at all: it stays
 * on the device as the player's own edit, for them to finish.
 */
type Outcome = 'saved' | 'locked' | 'refused' | 'retry';

/**
 * Run one submission and say what became of it. A lock is the common refusal
 * and gets its own line in the toast; any other ConvexError is the server
 * refusing for good (a retired pairing, say), so the draft is not retried;
 * anything else, a dropped connection, is worth trying at the next sign-in.
 */
async function attempt(submit: () => Promise<unknown>): Promise<Outcome> {
  try {
    await submit();
    return 'saved';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/locked/i.test(message)) {
      return 'locked';
    }
    return error instanceof ConvexError ? 'refused' : 'retry';
  }
}

export function PendingPickSubmitter() {
  const { isAuthenticated } = useConvexAuth();
  const submitTopFive = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const { showToast, celebratePicks } = useToast();
  // Drafts are keyed by race slug; the mutations take an id, so each one is
  // resolved here rather than storing an id that could outlive its race.
  const convex = useConvex();
  const drainedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Re-arm on sign-out. Once per sign-in, not once per launch: a player
      // who signs out, drafts a card as a guest and signs back in has a draft
      // waiting again, and a flag that never reset left it on the device.
      drainedRef.current = false;
      return;
    }
    if (drainedRef.current) {
      return;
    }
    drainedRef.current = true;

    async function drain() {
      const drafts = await listPendingDrafts();
      if (drafts.length === 0) {
        return;
      }

      let saved = 0;
      let locked = 0;
      let failed = 0;
      let unfinished = 0;

      for (const draft of drafts) {
        let race: { _id: ConvexId<'races'> } | null = null;
        try {
          race = await convex.query(api.races.getRaceBySlug, {
            slug: draft.raceSlug,
          });
        } catch {
          // Offline or a blip: leave the draft for the next sign-in.
          failed += 1;
          continue;
        }
        if (!race) {
          failed += 1;
          await clearConnectedDraft(draft.raceSlug, draft.session);
          continue;
        }
        const sessionType =
          draft.scope === 'session' ? draft.session : undefined;

        // The two halves succeed or fail on their own. One try around both
        // threw away a saved Top 5 whenever the duels failed, and a partial
        // Top 5 (the editor saves every tap) was sent, refused with "Pick
        // exactly 5 drivers", and deleted along with the duels.
        const topFiveComplete = draft.top5.length === 5;
        let topFiveSettled = draft.top5.length === 0;
        let h2hSettled = Object.keys(draft.h2hByMatchup).length === 0;
        let anySaved = false;

        if (topFiveComplete) {
          const outcome = await attempt(() =>
            submitTopFive({
              raceId: race._id,
              sessionType,
              picks: draft.top5 as ConvexId<'drivers'>[],
            }),
          );
          topFiveSettled = outcome !== 'retry';
          anySaved ||= outcome === 'saved';
          if (outcome === 'locked') {
            locked += 1;
          }
          if (outcome === 'retry') {
            failed += 1;
          }
        } else if (draft.top5.length > 0) {
          unfinished += 1;
        }

        const h2h = Object.entries(draft.h2hByMatchup);
        if (h2h.length > 0) {
          const outcome = await attempt(() =>
            submitH2H({
              raceId: race._id,
              sessionType,
              picks: h2h.map(([matchupId, driverId]) => ({
                matchupId: matchupId as ConvexId<'h2hMatchups'>,
                predictedWinnerId: driverId as ConvexId<'drivers'>,
              })),
            }),
          );
          h2hSettled = outcome !== 'retry';
          anySaved ||= outcome === 'saved';
          if (outcome === 'locked') {
            locked += 1;
          }
          if (outcome === 'retry') {
            failed += 1;
          }
        }

        if (anySaved) {
          saved += 1;
        }
        if (
          topFiveSettled &&
          h2hSettled &&
          (topFiveComplete || draft.top5.length === 0)
        ) {
          await clearConnectedDraft(draft.raceSlug, draft.session);
        } else {
          // Keep what is left as this player's own unsaved edit: the editor
          // offers it back, and it is no longer a guest card to drain.
          await patchConnectedDraft(draft.raceSlug, draft.session, {
            awaitingAccount: false,
            ...(topFiveSettled && topFiveComplete ? { top5: [] } : {}),
            ...(h2hSettled ? { h2hByMatchup: {} } : {}),
          });
        }
      }

      if (saved > 0) {
        celebratePicks();
        showToast(
          saved === 1
            ? '🏁 Your picks are in'
            : `🏁 ${saved} sets of picks saved`,
          'success',
        );
      }
      if (locked > 0) {
        showToast(
          'Some picks could not be saved: that session had already locked.',
          'error',
        );
      } else if (failed > 0) {
        showToast(
          'Some picks could not be saved. Open your picks to try again.',
          'error',
        );
      } else if (unfinished > 0) {
        showToast(
          'Your Top 5 is not finished. Pick 5 drivers to save it.',
          'info',
        );
      }
    }

    void drain();
  }, [
    celebratePicks,
    convex,
    isAuthenticated,
    showToast,
    submitH2H,
    submitTopFive,
  ]);

  return null;
}
