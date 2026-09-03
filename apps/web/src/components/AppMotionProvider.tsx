import { domMax, LazyMotion, MotionConfig } from 'framer-motion';
import type { PropsWithChildren } from 'react';

/**
 * Framer Motion, minus its feature set, on the critical path.
 *
 * Importing `motion.div` anywhere pulls the whole animation engine into the
 * entry graph — it was a modulepreload in the document head, ~123 KB of which
 * 88 KB never ran on a landing visit. `LazyMotion` + the `m` component ship
 * only the renderer, and the features arrive in their own chunk right after.
 *
 * `domMax` rather than `domAnimation` because `PredictionForm` animates pick
 * reordering with `layout`, which lives in the larger bundle. Everything else
 * in the app only needs initial/animate/exit and tap/hover, which either bundle
 * would cover.
 *
 * `strict` makes the swap enforceable: any `motion.*` left behind (or added
 * later) throws instead of silently pulling the full engine back onto the
 * critical path. Use `m.*` from 'framer-motion' instead.
 *
 * LazyMotion destructures whatever `features()` resolves. A chunk that fails
 * soft (empty module) or hard (network) must never resolve `undefined`, or
 * Mobile Safari throws "Right side of assignment cannot be destructured".
 * `domMax` is the synchronous backstop so the page still renders.
 */
export function resolveMotionFeatures(
  module: { motionFeatures?: typeof domMax } | null | undefined,
  fallback: typeof domMax = domMax,
): typeof domMax {
  return module?.motionFeatures ?? fallback;
}

export function loadMotionFeatures(): Promise<typeof domMax> {
  return import('./motionFeatures')
    .then((module) => resolveMotionFeatures(module, domMax))
    .catch(() => domMax);
}

export function AppMotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
