import { useEffect, useState } from 'react';

const DEV_NOW_STORAGE_KEY = 'gpp:dev-now';
const DEV_NOW_EVENT = 'gpp:dev-now-change';

function getNow(): number {
  return getDevNowOverride() ?? Date.now();
}

export function getDevNowOverride(): number | null {
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
  const [now, setNow] = useState(() => getNow());

  useEffect(() => {
    function syncNow() {
      setNow(getNow());
    }

    syncNow();

    function handleStorage(event: StorageEvent) {
      if (event.key === DEV_NOW_STORAGE_KEY) {
        syncNow();
      }
    };
    function handleManualChange() {
      syncNow();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(DEV_NOW_EVENT, handleManualChange);

    if (intervalMs <= 0) {
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(DEV_NOW_EVENT, handleManualChange);
      };
    }

    const id = window.setInterval(() => {
      syncNow();
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(DEV_NOW_EVENT, handleManualChange);
    };
  }, [intervalMs]);

  return now;
}

