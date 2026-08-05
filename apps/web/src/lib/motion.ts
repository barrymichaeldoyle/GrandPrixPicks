/**
 * Whether the user has asked for less motion.
 *
 * Framer's `useReducedMotion` covers components that render motion; this is
 * for the imperative side — confetti, timed holds, smooth scrolls — where
 * there is no hook to hang it on. Defaults to "no preference" when there is no
 * `matchMedia` (SSR, and jsdom without a stub), because the alternative is
 * silently disabling animation everywhere it is not implemented.
 */
export function prefersReducedMotion(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
