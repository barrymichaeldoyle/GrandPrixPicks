import { useEffect, useRef } from 'react';

type Stored<T> = { draft: T; savedAt: number };

/**
 * Keeps a half-written form in `sessionStorage` so it survives a remount.
 *
 * Signing in from a Clerk-free route swaps the anonymous provider tree for the
 * signed-in one, which unmounts the page and everything in its `useState`. A
 * redirect sign-in (Google, Apple) reloads it outright. Either way a visitor
 * who wrote a message and then signed in to send it came back to an empty form.
 *
 * Pass `null` when there is nothing worth keeping, which also clears the entry
 * after a send. `onRestore` runs once on mount, in an effect so the first
 * client render still matches the server's, with the draft's age so a caller
 * can refuse to act on an old one.
 */
export function useSessionDraft<T>(
  key: string,
  draft: T | null,
  onRestore: (draft: T, ageMs: number) => void,
) {
  const mountedRef = useRef(false);
  const serialized = draft === null ? null : JSON.stringify(draft);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) {
        return;
      }
      const stored = JSON.parse(raw) as Stored<T>;
      onRestore(stored.draft, Date.now() - stored.savedAt);
    } catch {
      // Storage is blocked or the entry is malformed: start with an empty form.
    }
    // Restores once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // The first run sees the empty form from before the restore above lands.
    // Writing that would erase the draft it is about to bring back.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    try {
      if (serialized === null) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(
          key,
          `{"draft":${serialized},"savedAt":${Date.now()}}`,
        );
      }
    } catch {
      // Storage is blocked: the draft lives in state only, as it did before.
    }
  }, [key, serialized]);
}

/** How long a "send this once I am signed in" intent stays valid. */
export const SEND_AFTER_SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
