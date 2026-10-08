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

/** Every stored key beginning with `prefix`. Used to find pending drafts. */
export async function listStoredKeys(prefix: string): Promise<string[]> {
  return storage.getAllKeys().filter((key) => key.startsWith(prefix));
}

/**
 * Synchronous reads and writes, for the persisted query cache: a screen has
 * to render its stored value on the first frame, not a tick later.
 */
export function getStoredStringSync(key: string): string | undefined {
  return storage.getString(key);
}

export function setStoredStringSync(key: string, value: string) {
  storage.set(key, value);
}

export function removeStoredValueSync(key: string) {
  storage.remove(key);
}

export function listStoredKeysSync(prefix: string): string[] {
  return storage.getAllKeys().filter((key) => key.startsWith(prefix));
}
