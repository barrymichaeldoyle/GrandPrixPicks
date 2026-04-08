import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({
  id: 'grandprixpicks.app',
});

export async function getStoredJson<T>(key: string): Promise<T | null> {
  const raw = storage.getString(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setStoredJson(key: string, value: unknown) {
  storage.set(key, JSON.stringify(value));
}

export async function removeStoredValue(key: string) {
  storage.remove(key);
}
