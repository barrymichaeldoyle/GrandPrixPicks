import { domMax } from 'framer-motion';

/**
 * Secondary lazy chunk for when the primary motionFeatures import fails or
 * resolves without an export. Kept separate so the happy path stays split.
 */
export const motionFeaturesFallback = domMax;
