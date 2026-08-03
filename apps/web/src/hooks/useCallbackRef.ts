import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect';

/**
 * A stable wrapper around a callback prop that always calls the latest version.
 *
 * For notifying a parent from an effect — "the selection count changed", "the
 * form is dirty now" — the effect should fire when the *data* changes, never
 * when the callback's identity does. Listing a caller-supplied function in a
 * dependency array delegates that decision to the caller, and one inline arrow
 * in their JSX turns it into a render loop: new identity every render, effect
 * re-runs every render, `setState` every render.
 *
 * React Compiler would memoize most such arrows, but it only runs on production
 * builds here, so dev would loop where prod did not. This removes the question.
 */
export function useCallbackRef<Args extends unknown[]>(
  callback: ((...args: Args) => void) | undefined,
) {
  const callbackRef = useRef(callback);

  useIsomorphicLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Not memoized, and does not need to be: this function closes over nothing
  // but a ref, so the identity React hands out is irrelevant to correctness.
  // Callers store it in a ref of their own if they need a stable dependency.
  return useRef((...args: Args) => callbackRef.current?.(...args)).current;
}
