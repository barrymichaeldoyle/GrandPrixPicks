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

export function getDevNowOverride(): number | null {
  return readDevNowOverride();
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

export function useNow(intervalMs = 1_000): number {
  const overrideNow = useDevNowOverride();
  const [realNow, setRealNow] = useState(() => Date.now());

  useEffect(() => {
    if (overrideNow != null || intervalMs <= 0) {
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
