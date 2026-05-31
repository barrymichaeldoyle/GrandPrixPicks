import { getConnectedDraftStorageKey } from '@grandprixpicks/shared/picks';
import type { SessionType } from '@grandprixpicks/shared/sessions';

import { getStoredJson, removeStoredValue, setStoredJson } from './storage';

type ConnectedDraft = {
  h2hByMatchup: Record<string, string>;
  top5: Array<string>;
  updatedAt: string;
};

export async function loadConnectedDraft(
  raceSlug: string,
  session: SessionType,
): Promise<ConnectedDraft | null> {
  return getStoredJson<ConnectedDraft>(
    getConnectedDraftStorageKey(raceSlug, session),
  );
}

export async function saveConnectedDraft(
  raceSlug: string,
  session: SessionType,
  draft: ConnectedDraft,
) {
  await setStoredJson(getConnectedDraftStorageKey(raceSlug, session), draft);
}

export async function clearConnectedDraft(
  raceSlug: string,
  session: SessionType,
) {
  await removeStoredValue(getConnectedDraftStorageKey(raceSlug, session));
}

/**
 * Merge a partial update into the existing draft (preserving the other half).
 *
 * The connected draft holds both Top 5 and H2H. Without a read-modify-write,
 * one editor's save would clobber the other's in-progress work. Drops the
 * stored draft entirely when the merged result has no picks left.
 */
export async function patchConnectedDraft(
  raceSlug: string,
  session: SessionType,
  patch: Partial<Pick<ConnectedDraft, 'h2hByMatchup' | 'top5'>>,
) {
  const existing = await loadConnectedDraft(raceSlug, session);
  const next: ConnectedDraft = {
    h2hByMatchup: patch.h2hByMatchup ?? existing?.h2hByMatchup ?? {},
    top5: patch.top5 ?? existing?.top5 ?? [],
    updatedAt: new Date().toISOString(),
  };
  const isEmpty =
    next.top5.length === 0 && Object.keys(next.h2hByMatchup).length === 0;
  if (isEmpty) {
    await clearConnectedDraft(raceSlug, session);
    return;
  }
  await setStoredJson(getConnectedDraftStorageKey(raceSlug, session), next);
}
