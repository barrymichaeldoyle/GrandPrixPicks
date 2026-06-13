import { useRef } from 'react';

/**
 * Retains the last non-undefined value so tabs show cached data instead of a
 * loader when their query is re-activated after being skipped.
 */
export function useStickyValue<T>(value: T | undefined): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  if (value !== undefined) {
    ref.current = value;
  }
  return ref.current;
}
