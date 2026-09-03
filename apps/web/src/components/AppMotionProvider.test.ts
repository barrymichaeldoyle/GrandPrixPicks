import { domMax } from 'framer-motion';
import { describe, expect, it } from 'vitest';

import { resolveMotionFeatures } from './AppMotionProvider';

describe('resolveMotionFeatures', () => {
  it('returns the lazy chunk when motionFeatures is present', () => {
    const lazyFeatures = { renderer: domMax.renderer } as typeof domMax;

    expect(resolveMotionFeatures({ motionFeatures: lazyFeatures })).toBe(
      lazyFeatures,
    );
  });

  it('falls back when the dynamic chunk resolves without motionFeatures', () => {
    const fallback = { renderer: domMax.renderer } as typeof domMax;

    expect(resolveMotionFeatures({}, fallback)).toBe(fallback);
    expect(resolveMotionFeatures(undefined, fallback)).toBe(fallback);
    expect(resolveMotionFeatures(null, fallback)).toBe(fallback);
  });
});
