import { describe, expect, it } from 'vitest';

import { lastQualifyingPart } from './sessionTiming';

describe('lastQualifyingPart', () => {
  it('is the last part with a lap', () => {
    expect(
      lastQualifyingPart({ position: 1, qualifyingSeconds: [90, 89, 88] }),
    ).toBe(2);
    // Reached Q3 without setting a time there: timed from Q2.
    expect(
      lastQualifyingPart({ position: 10, qualifyingSeconds: [90, 89, null] }),
    ).toBe(1);
  });

  it('is null outside qualifying or with no lap', () => {
    expect(lastQualifyingPart({ position: 1 })).toBeNull();
    expect(
      lastQualifyingPart({ position: 22, qualifyingSeconds: [null] }),
    ).toBeNull();
  });
});
