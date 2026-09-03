import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  isReloadingForStaleChunk,
  isStaleChunkError,
  listenForStaleChunks,
  reloadForStaleChunk,
  resetStaleChunkReloadState,
} from './staleChunk';

describe('isStaleChunkError', () => {
  it('matches the wording each browser uses for a chunk that would not load', () => {
    expect(
      isStaleChunkError(
        new Error('Failed to fetch dynamically imported module'),
      ),
    ).toBe(true);
    expect(
      isStaleChunkError(new Error('Importing a module script failed.')),
    ).toBe(true);
    expect(isStaleChunkError('Unable to preload CSS')).toBe(true);
  });

  it('leaves the teardown TypeErrors alone', () => {
    // These are what a handled preload failure turns awaiting callers into.
    // They are suppressed by the reload flag, on cause — never by their
    // wording, which is indistinguishable from a real bug's.
    expect(
      isStaleChunkError(
        new TypeError(
          "Cannot read properties of undefined (reading 'component')",
        ),
      ),
    ).toBe(false);
    expect(
      isStaleChunkError(
        new TypeError('Right side of assignment cannot be destructured'),
      ),
    ).toBe(false);
  });
});

describe('reloadForStaleChunk', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetStaleChunkReloadState();
    window.sessionStorage.clear();
    reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetStaleChunkReloadState();
    window.sessionStorage.clear();
  });

  it('reloads once and reports that it handled the failure', () => {
    expect(isReloadingForStaleChunk()).toBe(false);

    expect(reloadForStaleChunk()).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(isReloadingForStaleChunk()).toBe(true);
  });

  it('stays raised for the rest of the page, so teardown noise is suppressed', () => {
    reloadForStaleChunk();

    // `location.reload()` does not stop JavaScript. Everything that runs
    // between here and the navigation committing — the `undefined` Vite hands
    // back to awaiting dynamic imports, and every TypeError that follows —
    // must read as teardown, not as a defect.
    expect(isReloadingForStaleChunk()).toBe(true);
  });

  it('does not reload twice inside the cooldown', () => {
    expect(reloadForStaleChunk()).toBe(true);
    expect(reloadForStaleChunk()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads when sessionStorage is unavailable', () => {
    // Safari in Lockdown Mode and some private windows throw on access.
    vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(reloadForStaleChunk()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('listenForStaleChunks', () => {
  let reload: ReturnType<typeof vi.fn>;

  // Once, not per test: the listener is global and has no disposer, so
  // registering it in `beforeEach` would stack a fresh copy for every case.
  beforeAll(() => {
    listenForStaleChunks();
  });

  beforeEach(() => {
    resetStaleChunkReloadState();
    window.sessionStorage.clear();
    reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetStaleChunkReloadState();
    window.sessionStorage.clear();
  });

  /**
   * Vite's preload helper, transcribed from the shipped bundle. The shape is
   * the whole point: `handlePreloadError` only rethrows when the event was not
   * prevented, so preventing it makes `.catch()` return normally and the
   * import resolve with `undefined`.
   */
  function vitePreload<T>(load: () => Promise<T>): Promise<T | undefined> {
    function handlePreloadError(err: unknown): undefined {
      const event = new Event('vite:preloadError', { cancelable: true });
      (event as Event & { payload?: unknown }).payload = err;
      window.dispatchEvent(event);
      if (!event.defaultPrevented) {
        throw err;
      }
      return undefined;
    }
    return load().catch(handlePreloadError);
  }

  it('reloads and swallows the error when a chunk fails to load', async () => {
    const result = await vitePreload(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module')),
    );

    expect(reload).toHaveBeenCalledTimes(1);
    // The contract the rest of the fix rests on: preventing the event costs us
    // the rejection, so callers are handed `undefined` and go on to throw
    // their own unrelated-looking TypeErrors. That is why the flag exists.
    expect(result).toBeUndefined();
    expect(isReloadingForStaleChunk()).toBe(true);
  });

  it('lets the error through when it is not taking the reload', async () => {
    // Second failure inside the cooldown: reloading did not help, so this is
    // a real fault and must reach the error boundary as a rejection.
    await expect(
      vitePreload(() => Promise.reject(new Error('boom'))),
    ).resolves.toBeUndefined();
    reload.mockClear();

    await expect(
      vitePreload(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(reload).not.toHaveBeenCalled();
  });
});
