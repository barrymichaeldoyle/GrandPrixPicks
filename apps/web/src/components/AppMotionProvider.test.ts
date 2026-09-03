import { domMax } from 'framer-motion';
import { describe, expect, it } from 'vitest';

import { loadMotionFeatures } from './motionFeaturesLoader';

async function expectToRemainPending(promise: Promise<unknown>) {
  let state = 'pending';
  void promise.then(
    () => {
      state = 'fulfilled';
    },
    () => {
      state = 'rejected';
    },
  );

  await Promise.resolve();
  await Promise.resolve();
  expect(state).toBe('pending');
}

describe('loadMotionFeatures', () => {
  it('returns the lazy chunk when motionFeatures is present', async () => {
    const lazyFeatures = { renderer: domMax.renderer } as typeof domMax;

    await expect(
      loadMotionFeatures(() =>
        Promise.resolve({ motionFeatures: lazyFeatures }),
      ),
    ).resolves.toBe(lazyFeatures);
  });

  it.each([{}, undefined, null])(
    'stays pending when the dynamic chunk resolves as %s',
    async (module) => {
      await expectToRemainPending(
        loadMotionFeatures(() => Promise.resolve(module)),
      );
    },
  );

  it('stays pending when the dynamic import rejects', async () => {
    await expectToRemainPending(
      loadMotionFeatures(() => Promise.reject(new Error('chunk failed'))),
    );
  });
});
