/**
 * Recovering from a deploy that landed under someone's feet.
 *
 * The HTML a visitor is holding names its JS chunks by content hash. Deploy
 * again and those files stop existing, so the next lazy route they open fails
 * its dynamic import and the router hands them the error screen. Sentry sees
 * it as "Failed to fetch dynamically imported module" and "Importing a module
 * script failed" — two of the nine issues in the tray, and the ones a race
 * weekend produces most, because that is when people sit on an open tab.
 *
 * This is not a bug in the code that failed to load. There is nothing to fix
 * in the notifications chunk; the visitor is simply one deploy behind. The
 * repair is to fetch the new HTML, which is what a reload does.
 *
 * The reload is rate-limited rather than counted. A counter has to be cleared
 * on success, and there is no reliable "success" event to hang that on — the
 * next failure could be a genuinely broken build, and clearing too eagerly
 * gives an infinite loop. A timestamp needs no cleanup: if reloading did not
 * help, the second failure lands inside the window and we show the error
 * screen like any other fault.
 */

const RELOAD_MARK_KEY = 'gpp:stale-chunk-reload-at';

/** Long enough to cover a reload plus a slow first paint on a phone. */
const RELOAD_COOLDOWN_MS = 20_000;

/**
 * Vite's own wording, plus Safari's and Firefox's, since each browser writes
 * its own message for a module that would not load.
 */
const STALE_CHUNK_MESSAGE =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|'?text\/html'? is not a valid javascript mime type/i;

export function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return STALE_CHUNK_MESSAGE.test(message);
}

/**
 * Reloads once per cooldown window. Returns whether it took the reload, so a
 * caller can suppress its own error reporting for the case it handled.
 *
 * Storage access is wrapped: Safari throws on `sessionStorage` in Lockdown
 * Mode and some private windows, and a browser that will not remember the
 * mark should still get one reload rather than an exception on top of the
 * error it is already handling.
 */
export function reloadForStaleChunk(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  let markedAt = 0;
  try {
    markedAt = Number(window.sessionStorage.getItem(RELOAD_MARK_KEY) ?? 0);
  } catch {
    markedAt = 0;
  }

  if (Number.isFinite(markedAt) && Date.now() - markedAt < RELOAD_COOLDOWN_MS) {
    return false;
  }

  try {
    window.sessionStorage.setItem(RELOAD_MARK_KEY, String(Date.now()));
  } catch {
    // Nothing to do: without the mark we may reload twice, which is still a
    // better outcome than the error screen.
  }

  window.location.reload();
  return true;
}

/**
 * Vite fires `vite:preloadError` when a preloaded chunk fails, which catches
 * most of these before they ever reach an error boundary. Calling
 * `preventDefault` stops Vite rethrowing the error we are already handling.
 */
export function listenForStaleChunks(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForStaleChunk()) {
      event.preventDefault();
    }
  });
}
