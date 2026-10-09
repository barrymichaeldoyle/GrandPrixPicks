import { useConvexConnectionState } from 'convex/react';
import { useEffect, useState } from 'react';

import {
  HOME_PAINT_CONNECTED_TIMEOUT_MS,
  HOME_PAINT_DISCONNECTED_TIMEOUT_MS,
  shouldHoldHomePaint,
} from './homePaint';

/**
 * Whether Home should still show the full-screen loader.
 *
 * Convex keeps the last value once a query has answered, so after first paint
 * this stays down even if the socket drops. A timeout (and a known-offline
 * socket) exist so the first launch with no network is not an infinite wait.
 */
export function useHomePaintGate(pending: boolean): boolean {
  const { hasEverConnected, isWebSocketConnected } = useConvexConnectionState();
  const [timedOut, setTimedOut] = useState(false);
  const knownOffline = hasEverConnected && !isWebSocketConnected;
  const timeoutMs = isWebSocketConnected
    ? HOME_PAINT_CONNECTED_TIMEOUT_MS
    : HOME_PAINT_DISCONNECTED_TIMEOUT_MS;

  useEffect(() => {
    if (!pending || knownOffline) {
      return;
    }
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [knownOffline, pending, timeoutMs]);

  // Latch once the feed has painted. The inputs are live queries, and one
  // going back to loading (the weather query's hourly bucket changes its
  // arguments; the cached hook reads `undefined` for new arguments) swapped
  // the whole list for a spinner mid-scroll: a flash, and the scroll position
  // lost with the unmounted list.
  const [painted, setPainted] = useState(false);
  const hold = shouldHoldHomePaint({ knownOffline, pending, timedOut });
  if (!hold && !painted) {
    // Adjusting state while rendering, once: React re-renders immediately.
    setPainted(true);
  }
  return painted ? false : hold;
}
