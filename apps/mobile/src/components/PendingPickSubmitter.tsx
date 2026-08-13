import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useConvex, useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useRef } from 'react';

import { clearConnectedDraft, listPendingDrafts } from '../lib/picksDrafts';
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
 * A draft for a session that has since locked will be rejected by the server,
 * which is the correct outcome. It is cleared either way so it cannot sit
 * there being retried forever, and the reader is told rather than left to
 * discover an empty card.
 */
export function PendingPickSubmitter() {
  const { isAuthenticated } = useConvexAuth();
  const submitTopFive = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const { showToast } = useToast();
  // Drafts are keyed by race slug; the mutations take an id, so each one is
  // resolved here rather than storing an id that could outlive its race.
  const convex = useConvex();
  const drainedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || drainedRef.current) {
      return;
    }
    drainedRef.current = true;

    async function drain() {
      const drafts = await listPendingDrafts();
      if (drafts.length === 0) {
        return;
      }

      let saved = 0;
      let missed = 0;

      for (const draft of drafts) {
        try {
          const race = await convex.query(api.races.getRaceBySlug, {
            slug: draft.raceSlug,
          });
          if (!race) {
            missed += 1;
            await clearConnectedDraft(draft.raceSlug, draft.session);
            continue;
          }
          if (draft.top5.length > 0) {
            await submitTopFive({
              raceId: race._id,
              sessionType: draft.session,
              picks: draft.top5 as ConvexId<'drivers'>[],
            });
          }
          const h2h = Object.entries(draft.h2hByMatchup);
          if (h2h.length > 0) {
            await submitH2H({
              raceId: race._id,
              sessionType: draft.session,
              picks: h2h.map(([matchupId, driverId]) => ({
                matchupId: matchupId as ConvexId<'h2hMatchups'>,
                predictedWinnerId: driverId as ConvexId<'drivers'>,
              })),
            });
          }
          saved += 1;
        } catch {
          // Almost always "the session locked while you were signing in".
          missed += 1;
        }
        await clearConnectedDraft(draft.raceSlug, draft.session);
      }

      if (saved > 0) {
        showToast(
          saved === 1
            ? '🏁 Your picks are in'
            : `🏁 ${saved} sets of picks saved`,
          'success',
        );
      }
      if (missed > 0) {
        showToast(
          'Some picks could not be saved: that session had already locked.',
          'error',
        );
      }
    }

    void drain();
  }, [convex, isAuthenticated, showToast, submitH2H, submitTopFive]);

  return null;
}
