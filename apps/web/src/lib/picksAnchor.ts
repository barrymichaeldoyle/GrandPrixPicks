import { useEffect, useSyncExternalStore } from 'react';

/**
 * The id of the in-page Top 5 picker, wherever a page carries one.
 *
 * Three surfaces render a picker the reader can reach without navigating: the
 * signed-out landing page, the editorial race write-ups, and the predictions
 * hub. They deliberately share one id so a link can target whichever of them
 * the reader is currently on.
 */
export const PICKS_ANCHOR = 'make-picks';

/**
 * How many picker sections are mounted right now.
 *
 * The public header's call to action needs to know whether the page in front
 * of the reader has a picker, so it can scroll to it instead of sending them
 * to the landing page's. Two simpler answers both fail:
 *
 * - A list of paths that carry a picker is a second copy of the truth. It goes
 *   stale the first time a new surface embeds one, and the symptom is silent:
 *   the header just resumes sending those readers away.
 * - Looking the id up in the document reads the *outgoing* page. The router
 *   publishes the new pathname before the new route's markup is committed, so
 *   an effect keyed on the pathname answers for the page just left, and the
 *   header ends up exactly one navigation behind.
 *
 * So the sections say so themselves, on mount. A count rather than a flag
 * because a route transition can briefly hold the old section and the new one
 * at the same time, and a flag would be cleared by the outgoing unmount.
 */
let mountedPickers = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return mountedPickers > 0;
}

/** No effects run on the server, so nothing has registered yet. */
function getServerSnapshot(): boolean {
  return false;
}

/** Call from any section that renders `id={PICKS_ANCHOR}`. */
export function useRegisterPicksAnchor(): void {
  useEffect(() => {
    mountedPickers += 1;
    for (const listener of listeners) {
      listener();
    }
    return () => {
      mountedPickers -= 1;
      for (const listener of listeners) {
        listener();
      }
    };
  }, []);
}

/** Whether the page in front of the reader has a picker of its own. */
export function useHasPicksAnchorOnPage(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
