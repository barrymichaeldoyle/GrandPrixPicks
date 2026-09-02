import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { parseWebDraftStorageKey } from '@grandprixpicks/shared/picks';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useRef, useState } from 'react';

import { useAuthCurtainGate } from '@/integrations/clerk/auth-curtain';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  clearPendingSubmit,
  clearPredictionDraft,
  listPendingSubmitDraftKeys,
  loadPredictionDraft,
} from '@/lib/predictionDrafts';

type Top5Draft = { picks?: Id<'drivers'>[] };
type H2HDraft = { selections?: Record<string, Id<'drivers'>> };

/**
 * Top 5 before Head-to-Head, always.
 *
 * `submitH2HPredictions` refuses a card from a player with no Top 5 for that
 * race ("Submit your top 5 predictions first"), so for a first-time player
 * these two submissions are ordered rather than independent. Nothing ordered
 * them: the loop below took `sessionStorage` in enumeration order, and the
 * intent flags are written Top 5 first, which looked like it was enough.
 *
 * It was not. `Storage.key()` order is implementation-defined, and Chrome
 * enumerates it *sorted*, where `gpp:web:h2h:` sorts ahead of `gpp:web:top5:`.
 * So the H2H card was always submitted first, always hit the gate, and -- since
 * a failed drain drops the intent and keeps only the draft -- was never
 * retried. Every player whose first-ever submission came through the landing
 * card lost the whole Head-to-Head half of it, silently, on signup. Their
 * second weekend worked, because by then they had a Top 5 on file, which is
 * why this survived: it only ever broke for brand new players.
 *
 * Sorting makes the dependency explicit instead of leaving it to the browser.
 */
function orderTopFiveFirst(keys: string[]) {
  return [...keys].sort((left, right) => {
    const leftKind = parseWebDraftStorageKey(left)?.kind;
    const rightKind = parseWebDraftStorageKey(right)?.kind;
    if (leftKind === rightKind) {
      return 0;
    }
    if (leftKind === 'top5') {
      return -1;
    }
    if (rightKind === 'top5') {
      return 1;
    }
    return 0;
  });
}

/**
 * Saves the picks a visitor made before they had an account.
 *
 * The forms each carry their own version of this, firing when auth lands on a
 * mounted form. That is enough on the race page, where the form is still there
 * afterwards, and it is not enough on the landing page: `HomePage` swaps the
 * whole public page for the dashboard the instant `isSignedIn` flips, so both
 * pickers unmount in the same commit and neither effect ever runs. A visitor
 * who built a full card and pressed "Sign in to submit" was met by the
 * dashboard asking them to make their picks, with the card sitting untouched
 * in storage. Nothing reached the database at all.
 *
 * So the recovery does not live in a form. This runs inside the authenticated
 * runtime, on every page, and drains whatever is pending wherever the visitor
 * happens to land. The forms keep their own path — when one *is* mounted it
 * usually wins the race, clears the flag first, and this finds nothing to do.
 * The exception is the H2H form, which now stands down while a Top 5 is also
 * pending, because that pair has to reach the server in order and only this
 * loop can guarantee it. See the comment on its auto-submit effect.
 *
 * Deliberately silent: no confetti, no toast. The picks were already promised
 * ("Your picks are kept when you sign in"), so their arrival is the expected
 * outcome
 * rather than an event, and the surface the visitor lands on shows them.
 */
export function PendingPickSubmitter() {
  const { isAuthenticated } = useConvexAuth();
  const submitTopFive = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const drainedRef = useRef(false);
  /**
   * Holds the sign-in curtain while the drain is in flight, so it lifts onto
   * the saved card instead of onto "Make your picks" and a beat of the picks
   * appearing underneath. Starts ready: outside a handoff there is no curtain,
   * and a visitor with nothing pending must never be gated on this.
   */
  const [draining, setDraining] = useState(false);
  useAuthCurtainGate(!draining);

  useEffect(() => {
    if (!isAuthenticated || drainedRef.current) {
      return;
    }
    const keys = orderTopFiveFirst(listPendingSubmitDraftKeys());
    if (keys.length === 0) {
      return;
    }
    // Once only, and before the first await: a second pass would re-submit
    // drafts this one has not finished clearing yet.
    drainedRef.current = true;
    // Starting this external storage drain is the effect's state transition.
    // oxlint-disable-next-line react/set-state-in-effect
    setDraining(true);

    let cancelled = false;
    void (async () => {
      for (const draftKey of keys) {
        const parsed = parseWebDraftStorageKey(draftKey);
        if (!parsed) {
          // Not ours to interpret, but the flag must still go: leaving it set
          // means retrying this forever on every page of the session.
          clearPendingSubmit(draftKey);
          continue;
        }
        const raceId = parsed.raceId as Id<'races'>;
        try {
          if (parsed.kind === 'top5') {
            const draft = loadPredictionDraft<Top5Draft>(draftKey);
            const picks = draft?.picks ?? [];
            if (picks.length !== 5) {
              // An incomplete card is not a submission. Drop the intent and
              // leave the draft, so the picker still restores what they had.
              clearPendingSubmit(draftKey);
              continue;
            }
            await submitTopFive({
              raceId,
              picks,
              sessionType: parsed.sessionType,
            });
          } else {
            const draft = loadPredictionDraft<H2HDraft>(draftKey);
            const selections = draft?.selections ?? {};
            const picks = Object.entries(selections).map(
              ([matchupId, predictedWinnerId]) => ({
                matchupId: matchupId as Id<'h2hMatchups'>,
                predictedWinnerId,
              }),
            );
            if (picks.length === 0) {
              clearPendingSubmit(draftKey);
              continue;
            }
            await submitH2H({ raceId, picks, sessionType: parsed.sessionType });
          }
          clearPredictionDraft(draftKey);
          clearPendingSubmit(draftKey);
          captureAnalyticsEvent('pending_pick_draft_recovered', {
            prediction_type: parsed.kind,
            race_id: parsed.raceId,
            session_type: parsed.sessionType ?? 'cascade',
          });
        } catch (error) {
          // The draft stays put so the picker can restore it and the player can
          // save it themselves; only the intent is dropped, because a session
          // that locked mid-signup would otherwise retry on every page load.
          clearPendingSubmit(draftKey);
          captureAnalyticsEvent('pending_pick_draft_recovery_failed', {
            prediction_type: parsed.kind,
            race_id: parsed.raceId,
            session_type: parsed.sessionType ?? 'cascade',
            reason: error instanceof Error ? error.message : 'unknown',
          });
        }
      }
      if (!cancelled) {
        setDraining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, submitH2H, submitTopFive]);

  return null;
}
