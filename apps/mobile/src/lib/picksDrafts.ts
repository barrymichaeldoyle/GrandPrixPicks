import {
  getConnectedDraftStorageKey,
  getLocalRaceDraftStorageKey,
} from '@grandprixpicks/shared/picks';
import type { SessionType } from '@grandprixpicks/shared/sessions';

import { getStoredJson, removeStoredValue, setStoredJson } from './storage';

type ConnectedDraft = {
  h2hByMatchup: Record<string, string>;
  top5: Array<string>;
  updatedAt: string;
};

type LocalRaceDraft = {
  h2hBySession: Record<SessionType, Record<string, string>>;
  top5BySession: Record<SessionType, Array<string>>;
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

export async function loadLocalRaceDraft(
  raceSlug: string,
): Promise<LocalRaceDraft | null> {
  return getStoredJson<LocalRaceDraft>(getLocalRaceDraftStorageKey(raceSlug));
}

export async function saveLocalRaceDraft(
  raceSlug: string,
  draft: LocalRaceDraft,
) {
  await setStoredJson(getLocalRaceDraftStorageKey(raceSlug), draft);
}

export async function clearLocalRaceDraft(raceSlug: string) {
  await removeStoredValue(getLocalRaceDraftStorageKey(raceSlug));
}
