import { useEffect, useState } from 'react';

/** Below this much time left a countdown shows seconds, so it ticks every second. */
export const SECONDS_SHOWN_WITHIN_MS = 24 * 60 * 60 * 1000;
/** Tick for a countdown that only shows days, hours and minutes. */
export const COARSE_TICK_MS = 15_000;

/**
 * How often a clock driving these countdowns needs to re-render.
 *
 * `useNow()` ticked every second on Home, the race page and the hero from
 * the Monday of a race week, and each tick re-rendered the whole picks card
 * under the feed. The formats only show seconds inside the last day
 * (`formatLockCountdown`, `getCountdownParts`), so until then a few ticks a
 * minute keep the minute right and leave the JS thread to the scroll.
 */
export function countdownTickMs(
  targets: ReadonlyArray<number | null | undefined>,
  nowMs: number,
): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    if (typeof target === 'number' && target > nowMs && target < nearest) {
      nearest = target;
    }
  }
  return nearest - nowMs < SECONDS_SHOWN_WITHIN_MS ? 1000 : COARSE_TICK_MS;
}

/** `useNow` for countdowns to `targets`: every second only once one is close. */
export function useCountdownNow(
  targets: ReadonlyArray<number | null | undefined>,
): number {
  const [now, setNow] = useState(() => Date.now());
  const refreshMs = countdownTickMs(targets, now);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, refreshMs);

    return () => clearInterval(interval);
  }, [refreshMs]);

  return now;
}

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
