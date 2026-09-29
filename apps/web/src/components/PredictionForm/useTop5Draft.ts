import type { Id } from '@convex-generated/dataModel';
import { useEffect, useState } from 'react';

import {
  clearPredictionDraft,
  loadPredictionDraft,
  savePredictionDraft,
} from '@/lib/predictionDrafts';
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect';

type Top5Draft = {
  picks: Id<'drivers'>[];
  updatedAt: string;
};

/**
 * The picks on screen, restored from and written back to the device draft.
 *
 * `hasChanges` compares against the saved picks, and it is what decides
 * whether a draft is kept at all: picks that match the server leave nothing on
 * the device.
 */
export function useTop5Draft({
  draftKey,
  existingPicks,
  initialDraftPicks,
  suppressDraftRestoredNotice,
}: {
  draftKey: string;
  existingPicks: Id<'drivers'>[] | undefined;
  initialDraftPicks: Id<'drivers'>[] | undefined;
  suppressDraftRestoredNotice: boolean;
}) {
  const [picks, setPicks] = useState<Id<'drivers'>[]>(
    existingPicks ?? initialDraftPicks ?? [],
  );
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  // Layout, not passive: the draft is the difference between five empty slots
  // and a filled grid, and a returning visitor should never watch the empty
  // version paint first. React flushes this re-render before the browser
  // paints, so the restore, the notice and every completion callback that
  // cascades off it (up to and including the landing page jumping to step 2)
  // resolve inside the same frame as hydration.
  useIsomorphicLayoutEffect(() => {
    const draft = loadPredictionDraft<Top5Draft>(draftKey);
    if (draft && draft.picks.length > 0) {
      setPicks(draft.picks);
      setRestoredDraftAt(suppressDraftRestoredNotice ? null : draft.updatedAt);
    } else {
      setPicks(existingPicks ?? initialDraftPicks ?? []);
      setRestoredDraftAt(null);
    }
    setHasHydratedDraft(true);
  }, [draftKey, existingPicks, initialDraftPicks, suppressDraftRestoredNotice]);

  const hasChanges = existingPicks
    ? JSON.stringify(picks) !== JSON.stringify(existingPicks)
    : picks.length > 0;

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    if (hasChanges) {
      savePredictionDraft<Top5Draft>(draftKey, {
        picks,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    clearPredictionDraft(draftKey);
  }, [draftKey, hasChanges, hasHydratedDraft, picks]);

  return {
    picks,
    setPicks,
    restoredDraftAt,
    setRestoredDraftAt,
    hasHydratedDraft,
    hasChanges,
  };
}
