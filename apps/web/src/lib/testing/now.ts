import { useEffect, useState, useSyncExternalStore } from 'react';

const DEV_NOW_STORAGE_KEY = 'gpp:dev-now';
const DEV_NOW_EVENT = 'gpp:dev-now-change';

function readDevNowOverride(): number | null {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(DEV_NOW_STORAGE_KEY);
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage access failures and fall back to real time.
    }
  }

  return null;
}

function subscribeToDevNow(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === DEV_NOW_STORAGE_KEY) {
      onStoreChange();
    }
  }

  function handleManualChange() {
    onStoreChange();
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(DEV_NOW_EVENT, handleManualChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(DEV_NOW_EVENT, handleManualChange);
  };
}

export function useDevNowOverride(): number | null {
  return useSyncExternalStore(
    subscribeToDevNow,
    readDevNowOverride,
    () => null,
  );
}

export function setDevNow(timestamp: number) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DEV_NOW_STORAGE_KEY, String(timestamp));
  window.dispatchEvent(new CustomEvent(DEV_NOW_EVENT));
}

export function clearDevNow() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(DEV_NOW_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(DEV_NOW_EVENT));
}

export function useNow(intervalMs = 1_000, initialNow?: number): number {
  const overrideNow = useDevNowOverride();
  // Seed with the server-provided timestamp when available so the first client
  // (hydration) render produces the exact same time-derived output as the
  // server-rendered HTML — otherwise `Date.now()` differs across the two and
  // React reports a hydration mismatch (e.g. the home-page countdown digits).
  // We re-read the real clock immediately after mount, so any staleness from
  // the SSR snapshot self-corrects without tripping hydration.
  const [realNow, setRealNow] = useState(() => initialNow ?? Date.now());

  useEffect(() => {
    if (overrideNow != null) {
      return;
    }

    // Sync to the real clock once hydration has completed.
    // oxlint-disable-next-line react/set-state-in-effect
    setRealNow(Date.now());

    if (intervalMs <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      setRealNow(Date.now());
    }, intervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [intervalMs, overrideNow]);

  return overrideNow ?? realNow;
}

/**
 * Whether the clock is still short of `timestamp`.
 *
 * A single scheduled timeout rather than a tick. `useNow` re-renders its whole
 * subtree on every interval, which is right for a countdown that has to show
 * seconds and wrong for a boundary that is crossed once: the dashboard's
 * results-first window ends eight hours after a race starts, and paying a
 * re-render of the page and its feed every minute to notice that is a poor
 * trade. This re-renders exactly twice — once on mount to correct the SSR
 * snapshot, once when the boundary passes.
 *
 * `initialNow` serves the same purpose as in `useNow`: seeding with the
 * server's clock keeps the hydration render's answer identical to the one the
 * server rendered.
 *
 * Dev time travel still works. An override is absolute, so no timer is needed:
 * the value changes through the store subscription instead.
 */
export function useIsBefore(
  timestamp: number | null | undefined,
  initialNow?: number,
): boolean {
  const overrideNow = useDevNowOverride();
  const [realNow, setRealNow] = useState(() => initialNow ?? Date.now());

  useEffect(() => {
    if (overrideNow != null || timestamp == null) {
      return;
    }

    // Sync to the real clock once hydration has completed, as `useNow` does.
    // oxlint-disable-next-line react/set-state-in-effect
    setRealNow(Date.now());

    const msRemaining = timestamp - Date.now();
    if (msRemaining <= 0) {
      return;
    }

    // `setTimeout` fires immediately for delays past the 32-bit limit, which
    // would spin. A boundary more than 24 days out cannot be this one, so
    // capping simply means "look again then".
    const id = window.setTimeout(
      () => {
        setRealNow(Date.now());
      },
      Math.min(msRemaining + 1_000, 2_147_483_000),
    );

    return () => {
      window.clearTimeout(id);
    };
  }, [timestamp, overrideNow]);

  if (timestamp == null) {
    return false;
  }
  return (overrideNow ?? realNow) < timestamp;
}
