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
 * The reloads are counted inside a window that expires by itself. A plain
 * counter would have to be cleared on success, and there is no reliable
 * "success" event to hang that on: the next failure could be a genuinely broken
 * build, and clearing too eagerly gives an infinite loop. A count tied to the
 * first attempt's timestamp needs no cleanup: once the window has passed, the
 * next failure starts a fresh one.
 *
 * Three attempts, spaced out, not one. A deploy is not atomic across
 * Cloudflare's edge: on 2026-11-18 the new HTML reached a visitor a few
 * minutes before its chunks did, so the one reload fetched the same HTML, hit
 * the same 404, and showed the error screen. Waiting 3s and then 10s before
 * the later reloads lets the assets catch up; if they still have not, the
 * error screen shows as for any other fault.
 */

const RELOAD_MARK_KEY = 'gpp:stale-chunk-reload-at';

/** How long a run of attempts counts as one. Covers all three, with room. */
const RELOAD_WINDOW_MS = 60_000;

/** Wait before each attempt in a window: at once, then 3s, then 10s. */
const RELOAD_DELAYS_MS = [0, 3_000, 10_000] as const;

type ReloadMark = { firstAt: number; count: number };

function readMark(): ReloadMark | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(RELOAD_MARK_KEY);
  } catch {
    return null;
  }
  if (!raw) {
    return null;
  }
  // The earlier format was a bare timestamp: one attempt.
  const legacy = Number(raw);
  if (Number.isFinite(legacy)) {
    return { firstAt: legacy, count: 1 };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ReloadMark>;
    return typeof parsed.firstAt === 'number' &&
      typeof parsed.count === 'number'
      ? { firstAt: parsed.firstAt, count: parsed.count }
      : null;
  } catch {
    return null;
  }
}

/**
 * Vite's own wording, plus Safari's and Firefox's, since each browser writes
 * its own message for a module that would not load.
 */
const STALE_CHUNK_MESSAGE =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|'?text\/html'? is not a valid javascript mime type/i;

/**
 * Whether we have already called `reload()` and are waiting for it to commit.
 *
 * `location.reload()` does not stop JavaScript: the current page keeps running
 * its microtasks until the navigation commits. That gap is not quiet, because
 * of how Vite's preload helper ends:
 *
 *     if (!event.defaultPrevented) throw err   // in the catch handler
 *     ...
 *     return promise.then(() => baseModule().catch(handlePreloadError))
 *
 * The `preventDefault` below stops Vite rethrowing an error we are handling —
 * and that also stops `handlePreloadError` throwing, so the `catch` returns
 * normally and **the dynamic import resolves with `undefined`**. Every awaiting
 * caller then destructures or dereferences nothing:
 *
 *   - TanStack reads `res[exportName]` and raises
 *     "Cannot read properties of undefined (reading 'component')".
 *   - Framer Motion's `LazyMotion` destructures `{ renderer, ...features }` and
 *     raises "Right side of assignment cannot be destructured".
 *
 * Neither message mentions a chunk and neither is a defect: they are the sound
 * of a page being torn down mid-reload. They arrived in the tray as
 * GRAND-PRIX-PICKS-24 and -25.
 *
 * The judgement is made on cause, not on wording or stack frames. An earlier
 * version matched `lazyRouteComponent` in the frame list, which cannot work:
 * a production build has no such string in it — the module names only come
 * back when Sentry applies source maps server-side, long after `beforeSend`
 * has run on the visitor's machine. The flag has no such blind spot, and it
 * covers callers we have not met yet rather than the two we have.
 *
 * In-memory on purpose. It describes this page, which is about to be replaced;
 * the fresh one must report its errors normally, so there is nothing to clear.
 */
let reloadInFlight = false;

export function isReloadingForStaleChunk(): boolean {
  return reloadInFlight;
}

/** Test seam: the flag is otherwise one-way for the life of the page. */
export function resetStaleChunkReloadState(): void {
  reloadInFlight = false;
}

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
 * Reloads onto the current HTML, up to three times a minute, waiting longer
 * before each later attempt. Returns whether it took the failure, so a caller
 * can suppress its own error reporting for the case it handled.
 *
 * Storage access is wrapped: Safari throws on `sessionStorage` in Lockdown
 * Mode and some private windows, and a browser that will not remember the
 * mark should still get a reload rather than an exception on top of the
 * error it is already handling.
 */
export function reloadForStaleChunk(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // This page is already on its way out; a second failing chunk on it is
  // the same failure, not a new attempt.
  if (reloadInFlight) {
    return true;
  }

  const now = Date.now();
  const mark = readMark();
  const inWindow = mark !== null && now - mark.firstAt < RELOAD_WINDOW_MS;
  const attempt = inWindow ? mark.count + 1 : 1;
  if (attempt > RELOAD_DELAYS_MS.length) {
    return false;
  }

  try {
    window.sessionStorage.setItem(
      RELOAD_MARK_KEY,
      JSON.stringify({
        firstAt: inWindow ? mark.firstAt : now,
        count: attempt,
      } satisfies ReloadMark),
    );
  } catch {
    // Nothing to do: without the mark we may reload more than three times,
    // which is still a better outcome than the error screen.
  }

  reloadInFlight = true;
  const delay = RELOAD_DELAYS_MS[attempt - 1]!;
  if (delay === 0) {
    window.location.reload();
  } else {
    window.setTimeout(() => window.location.reload(), delay);
  }
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
