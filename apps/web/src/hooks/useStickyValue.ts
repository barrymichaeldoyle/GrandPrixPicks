import { useRef } from 'react';

/**
 * Retains the last non-undefined value so tabs show cached data instead of a
 * loader when their query is re-activated after being skipped.
 */
export function useStickyValue<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  // This hook is deliberately a synchronous render cache: an effect would
  // flash the loading state it exists to avoid when a query is re-enabled.
  if (value !== undefined) {
    // oxlint-disable-next-line react/refs
    ref.current = value;
  }
  // oxlint-disable-next-line react/refs
  return ref.current;
}
