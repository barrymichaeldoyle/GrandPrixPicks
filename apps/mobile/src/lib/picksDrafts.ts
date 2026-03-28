import {
  getConnectedDraftStorageKey,
  getLocalRaceDraftStorageKey,
} from '@grandprixpicks/shared/picks';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const raw = await AsyncStorage.getItem(
    getConnectedDraftStorageKey(raceSlug, session),
  );
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ConnectedDraft;
  } catch {
    return null;
  }
}

export async function saveConnectedDraft(
  raceSlug: string,
  session: SessionType,
  draft: ConnectedDraft,
) {
  await AsyncStorage.setItem(
    getConnectedDraftStorageKey(raceSlug, session),
    JSON.stringify(draft),
  );
}

export async function clearConnectedDraft(
  raceSlug: string,
  session: SessionType,
) {
  await AsyncStorage.removeItem(getConnectedDraftStorageKey(raceSlug, session));
}

export async function loadLocalRaceDraft(
  raceSlug: string,
): Promise<LocalRaceDraft | null> {
  const raw = await AsyncStorage.getItem(getLocalRaceDraftStorageKey(raceSlug));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LocalRaceDraft;
  } catch {
    return null;
  }
}

export async function saveLocalRaceDraft(
  raceSlug: string,
  draft: LocalRaceDraft,
) {
  await AsyncStorage.setItem(
    getLocalRaceDraftStorageKey(raceSlug),
    JSON.stringify(draft),
  );
}

export async function clearLocalRaceDraft(raceSlug: string) {
  await AsyncStorage.removeItem(getLocalRaceDraftStorageKey(raceSlug));
}
