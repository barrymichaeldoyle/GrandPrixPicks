import type { SessionType } from '@grandprixpicks/shared/sessions';
import { useEffect, useState } from 'react';

import { loadConnectedDraft, subscribeToConnectedDrafts } from './picksDrafts';

export type ConnectedDraftView = {
  top5: ReadonlyArray<string>;
  h2hByMatchup: Record<string, string>;
  updatedAt: string;
};

const EMPTY: ConnectedDraftView = { top5: [], h2hByMatchup: {}, updatedAt: '' };

/**
 * The draft on this device for one race and session, kept current.
 *
 * A signed-out player's card lives only here until they sign in, so the home
 * screen shows it from storage the way it shows a signed-in player's card from
 * the server. Re-reads on every draft write (`subscribeToConnectedDrafts`),
 * which covers an editor closing with picks and the drain after sign-in.
 *
 * `enabled` false answers empty without touching storage: a signed-in player's
 * draft is unsaved edits, not a card, and must never show as one.
 */
export function useConnectedDraft(
  raceSlug: string,
  session: SessionType,
  enabled: boolean,
): ConnectedDraftView {
  const [draft, setDraft] = useState<ConnectedDraftView>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      // oxlint-disable-next-line react/set-state-in-effect
      setDraft(EMPTY);
      return;
    }
    let cancelled = false;
    async function read() {
      const stored = await loadConnectedDraft(raceSlug, session);
      if (cancelled) {
        return;
      }
      setDraft(
        stored
          ? {
              top5: stored.top5,
              h2hByMatchup: stored.h2hByMatchup,
              updatedAt: stored.updatedAt,
            }
          : EMPTY,
      );
    }
    void read();
    const unsubscribe = subscribeToConnectedDrafts(() => void read());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, raceSlug, session]);

  return draft;
}
