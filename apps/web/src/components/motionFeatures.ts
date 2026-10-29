import { domMin } from 'framer-motion';
import { layout } from 'framer-motion/layout-features';

/**
 * The animation engine, in a module of its own so it can be code-split.
 *
 * `LazyMotion features={() => import('framer-motion').then(m => m.domMax)}`
 * looks equivalent and is not: that dynamically imports the same barrel the app
 * already imports statically for `m` and `LazyMotion`, so every shared module
 * hoists back into the eager chunk and nothing splits. Re-exporting through a
 * dedicated module gives the bundler a graph where only the modules this
 * bundle actually reaches land in the dynamic chunk.
 *
 * PredictionForm animates pick reordering with `layout`. `domMax` is that plus
 * drag and pan, which this app never uses (dnd-kit owns dragging). After
 * framer-motion 14 grew the engine past the 26 kB lazy-chunk budget, the extra
 * gestures were enough to blow it. `domMin` covers initial/animate/exit;
 * layout is composed on top. Tap/hover in the app is CSS, not Motion
 * gestures.
 */
export const motionFeatures = {
  ...domMin,
  ...layout,
};
