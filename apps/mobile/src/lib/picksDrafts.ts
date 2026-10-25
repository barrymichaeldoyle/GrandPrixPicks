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
  /**
   * Whether the card was built in cascade mode (one card for every open
   * session) or as an edit to one session. The storage key names a session
   * either way, because a cascade draft is filed under `CASCADE_DRAFT_SESSION`,
   * so the key alone cannot say which; the drain after sign-in has to know,
   * or a weekend card is submitted to the race alone and qualifying is left
   * without picks. Absent on drafts written before this field existed, which
   * were all guest cards and therefore cascades.
   */
  scope?: 'cascade' | 'session';
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
  notifyDraftListeners();
}

export async function clearConnectedDraft(
  raceSlug: string,
  session: SessionType,
) {
  await removeStoredValue(getConnectedDraftStorageKey(raceSlug, session));
  notifyDraftListeners();
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
    Pick<ConnectedDraft, 'h2hByMatchup' | 'top5' | 'awaitingAccount' | 'scope'>
  >,
) {
  const existing = await loadConnectedDraft(raceSlug, session);
  const next: ConnectedDraft = {
    h2hByMatchup: patch.h2hByMatchup ?? existing?.h2hByMatchup ?? {},
    top5: patch.top5 ?? existing?.top5 ?? [],
    updatedAt: new Date().toISOString(),
    awaitingAccount: patch.awaitingAccount ?? existing?.awaitingAccount,
    scope: patch.scope ?? existing?.scope,
  };
  const isEmpty =
    next.top5.length === 0 && Object.keys(next.h2hByMatchup).length === 0;
  if (isEmpty) {
    await clearConnectedDraft(raceSlug, session);
    return;
  }
  await setStoredJson(getConnectedDraftStorageKey(raceSlug, session), next);
  notifyDraftListeners();
}

/**
 * Remove every pick draft on the device.
 *
 * Draft keys name a race and session but not a person, so at sign-out the
 * drafts on the phone are the outgoing player's. Left behind, the signed-out
 * Home showed them as a guest's card, and touching that card marked it as
 * waiting for an account, so the next person to sign in had them submitted
 * as theirs.
 */
export async function clearAllConnectedDrafts() {
  const keys = await listStoredKeys('gpp:draft:connected:');
  await Promise.all(keys.map((key) => removeStoredValue(key)));
  if (keys.length > 0) {
    notifyDraftListeners();
  }
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

// ─────────────────────────────────────────────────────────────────────────
// Change notifications
// ─────────────────────────────────────────────────────────────────────────

type DraftListener = () => void;
const listeners = new Set<DraftListener>();

/**
 * Runs `listener` after any draft write or clear, so a surface showing a draft
 * (the weekend card, signed out) re-reads it when an editor saves one and
 * when `PendingPickSubmitter` drains it after sign-in. MMKV has no change
 * events of its own, and every write goes through this module.
 */
export function subscribeToConnectedDrafts(listener: DraftListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyDraftListeners() {
  for (const listener of listeners) {
    listener();
  }
}
