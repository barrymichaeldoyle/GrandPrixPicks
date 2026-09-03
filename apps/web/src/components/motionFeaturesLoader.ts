import type { motionFeatures } from './motionFeatures';

type MotionFeatureBundle = typeof motionFeatures;
type MotionFeatureModule =
  | { motionFeatures?: MotionFeatureBundle }
  | null
  | undefined;
type MotionFeatureImporter = () => Promise<MotionFeatureModule>;

/**
 * LazyMotion has no rejection handler for an asynchronous feature loader. Keep
 * it in its initial, featureless state when a chunk is unavailable instead of
 * rejecting or resolving undefined. Vite's stale-chunk listener reloads the
 * page when appropriate; if a reload cannot help, the app remains usable
 * without animations.
 */
const unavailableMotionFeatures = new Promise<MotionFeatureBundle>(() => {});

export function loadMotionFeatures(
  importFeatures: MotionFeatureImporter = () => import('./motionFeatures'),
): Promise<MotionFeatureBundle> {
  return importFeatures().then(
    (module) => module?.motionFeatures ?? unavailableMotionFeatures,
    () => unavailableMotionFeatures,
  );
}
