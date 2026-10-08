import { getConnectedDraftStorageKey } from '@grandprixpicks/shared/picks';
import type { SessionType } from '@grandprixpicks/shared/sessions';

import {
  getStoredJson,
  listStoredKeys,
  removeStoredValue,
  setStoredJson,
} from './storage';

type ConnectedDraft = {
  h2hByMatchup: Record<string, string>;
  top5: Array<string>;
  updatedAt: string;
  /**
   * Written while signed out, so it is a card waiting for an account and
   * `PendingPickSubmitter` should submit it after sign-in. A signed-in
   * player's draft is only unsaved edits, kept so the editor can offer them
   * back; submitting those on the next launch saved changes the player had
   * walked away from.
   */
  awaitingAccount?: boolean;
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
  patch: Partial<
    Pick<ConnectedDraft, 'h2hByMatchup' | 'top5' | 'awaitingAccount'>
  >,
) {
  const existing = await loadConnectedDraft(raceSlug, session);
  const next: ConnectedDraft = {
    h2hByMatchup: patch.h2hByMatchup ?? existing?.h2hByMatchup ?? {},
    top5: patch.top5 ?? existing?.top5 ?? [],
    updatedAt: new Date().toISOString(),
    awaitingAccount: patch.awaitingAccount ?? existing?.awaitingAccount,
  };
  const isEmpty =
    next.top5.length === 0 && Object.keys(next.h2hByMatchup).length === 0;
  if (isEmpty) {
    await clearConnectedDraft(raceSlug, session);
    return;
  }
  await setStoredJson(getConnectedDraftStorageKey(raceSlug, session), next);
}

/** Shape of a stored draft plus the race and session it belongs to. */
export type PendingDraft = ConnectedDraft & {
  raceSlug: string;
  session: SessionType;
};

/**
 * Every draft made while signed out that is still on the device.
 *
 * Drafts are written as the reader edits, signed in or not. Only the
 * signed-out ones are picks waiting for an account; after sign-in this is
 * what has to be submitted on the reader's behalf.
 */
export async function listPendingDrafts(): Promise<PendingDraft[]> {
  const keys = await listStoredKeys('gpp:draft:connected:');
  const drafts: PendingDraft[] = [];

  for (const key of keys) {
    // gpp:draft:connected:<raceSlug>:<session>
    const rest = key.slice('gpp:draft:connected:'.length);
    const split = rest.lastIndexOf(':');
    if (split <= 0) {
      continue;
    }
    const raceSlug = rest.slice(0, split);
    const session = rest.slice(split + 1) as SessionType;
    const draft = await getStoredJson<ConnectedDraft>(key);
    if (!draft) {
      continue;
    }
    const isEmpty =
      draft.top5.length === 0 && Object.keys(draft.h2hByMatchup).length === 0;
    if (!isEmpty && draft.awaitingAccount === true) {
      drafts.push({ ...draft, raceSlug, session });
    }
  }

  return drafts;
}
