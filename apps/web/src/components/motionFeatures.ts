import { domMax } from 'framer-motion';

/**
 * The animation engine, in a module of its own so it can be code-split.
 *
 * `LazyMotion features={() => import('framer-motion').then(m => m.domMax)}`
 * looks equivalent and is not: that dynamically imports the same barrel the app
 * already imports statically for `m` and `LazyMotion`, so every shared module
 * hoists back into the eager chunk and nothing splits. Re-exporting through a
 * dedicated module gives the bundler a graph where only the modules `domMax`
 * actually reaches land in the dynamic chunk.
 *
 * `domMax` rather than `domAnimation` because PredictionForm animates pick
 * reordering with `layout`, which only the larger feature set provides.
 */
export const motionFeatures = domMax;
