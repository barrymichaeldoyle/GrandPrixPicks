import {
  getStoredStringSync,
  listStoredKeysSync,
  removeStoredValueSync,
  setStoredStringSync,
} from './storage';

/**
 * The last value of each Convex read, kept on the phone so the app opens with
 * something to show when there is no connection (`docs/mobile-mvp.md`,
 * offline). `useQuery` in `integrations/convex/query.ts` is the only reader
 * and writer.
 *
 * Keys carry the viewer, so one account's picks never render for another,
 * and sign-out clears that viewer's entries: a phone gets handed around.
 */

const PREFIX = 'gpp:q:';
const INDEX_KEY = 'gpp:qindex';
/** Enough for every tab and a few pushed screens; the oldest go first. */
export const MAX_ENTRIES = 80;
/** A value this large is a list nobody needs offline; skip it. */
export const MAX_VALUE_CHARS = 200_000;

export function persistedQueryKey(
  viewer: string,
  functionName: string,
  args: unknown,
): string | null {
  try {
    return `${PREFIX}${viewer}:${functionName}:${JSON.stringify(args ?? {})}`;
  } catch {
    return null;
  }
}

function readIndex(): string[] {
  const raw = getStoredStringSync(INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((key): key is string => typeof key === 'string')
      : [];
  } catch {
    return [];
  }
}

function writeIndex(keys: string[]) {
  setStoredStringSync(INDEX_KEY, JSON.stringify(keys));
}

export function readPersistedQuery(key: string): unknown {
  const raw = getStoredStringSync(key);
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function writePersistedQuery(key: string, value: unknown) {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    // Not JSON (a bigint, an ArrayBuffer): live-only.
    return;
  }
  if (raw === undefined || raw.length > MAX_VALUE_CHARS) {
    return;
  }
  if (getStoredStringSync(key) === raw) {
    return;
  }
  setStoredStringSync(key, raw);

  const index = readIndex().filter((existing) => existing !== key);
  index.push(key);
  while (index.length > MAX_ENTRIES) {
    const evicted = index.shift();
    if (evicted) {
      removeStoredValueSync(evicted);
    }
  }
  writeIndex(index);
}

/** Forget everything stored for one viewer (sign-out, account deletion). */
export function clearPersistedQueries(viewer: string) {
  const prefix = `${PREFIX}${viewer}:`;
  for (const key of listStoredKeysSync(prefix)) {
    removeStoredValueSync(key);
  }
  writeIndex(readIndex().filter((key) => !key.startsWith(prefix)));
}

/**
 * Which value a screen gets.
 *
 * Once Convex's auth has settled the live value wins, and the stored copy only
 * fills the wait for it. Before that, a signed-in viewer's queries answer as
 * if signed out for a moment; the stored copy is the viewer's own and is the
 * truer of the two, so it wins until auth lands. Those early answers are never
 * written for the same reason.
 */
export function choosePersistedOrLive<T>(input: {
  live: T | undefined;
  stored: T | undefined;
  authSettled: boolean;
}): T | undefined {
  return input.authSettled
    ? (input.live ?? input.stored)
    : (input.stored ?? input.live);
}
