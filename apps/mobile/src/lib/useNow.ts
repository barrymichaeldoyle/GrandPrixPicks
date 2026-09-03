import { useEffect, useState } from 'react';

export function useNow(refreshMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, refreshMs);

    return () => clearInterval(interval);
  }, [refreshMs]);

  return now;
}

/**
 * Whether the clock is still short of `timestamp`.
 *
 * A single scheduled timeout rather than a tick. `useNow` re-renders its whole
 * subtree every second, which is right for a countdown and wrong for a boundary
 * that is crossed once: the results-first window ends eight hours after a race
 * starts, and paying a re-render of a screen and its feed to notice that is a
 * poor trade.
 */
export function useIsBefore(timestamp: number | null | undefined): boolean {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timestamp == null) {
      return;
    }
    const msRemaining = timestamp - Date.now();
    if (msRemaining <= 0) {
      return;
    }

    // A delay past the 32-bit limit fires immediately and would spin. A
    // boundary more than 24 days out cannot be this one, so capping simply
    // means "look again then".
    const id = setTimeout(
      () => {
        setNow(Date.now());
      },
      Math.min(msRemaining + 1_000, 2_147_483_000),
    );

    return () => clearTimeout(id);
  }, [timestamp, now]);

  if (timestamp == null) {
    return false;
  }
  return now < timestamp;
}
