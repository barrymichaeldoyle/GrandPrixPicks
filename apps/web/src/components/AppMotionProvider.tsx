import { LazyMotion, MotionConfig } from 'framer-motion';
import type { PropsWithChildren } from 'react';

import { loadMotionFeatures } from './motionFeaturesLoader';

/**
 * Framer Motion, minus its feature set, on the critical path.
 *
 * Importing `motion.div` anywhere pulls the whole animation engine into the
 * entry graph — it was a modulepreload in the document head, ~123 KB of which
 * 88 KB never ran on a landing visit. `LazyMotion` + the `m` component ship
 * only the renderer, and the features arrive in their own chunk right after.
 *
 * The lazy chunk is `domMin` plus `layout`, not `domMax`. PredictionForm
 * animates pick reordering with `layout`; drag and pan from `domMax` are
 * unused (dnd-kit owns dragging) and were what pushed the engine over the
 * 26 kB budget after framer-motion 14.
 *
 * `strict` makes the swap enforceable: any `motion.*` left behind (or added
 * later) throws instead of silently pulling the full engine back onto the
 * critical path. Use `m.*` from 'framer-motion' instead.
 *
 * LazyMotion destructures whatever `features()` resolves. A chunk that fails
 * soft (empty module) or hard (network) must never resolve `undefined`, or
 * Mobile Safari throws "Right side of assignment cannot be destructured".
 * The loader stays pending on failure so the already-rendered page can finish
 * its stale-chunk reload without producing another unhandled rejection.
 */
export function AppMotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
