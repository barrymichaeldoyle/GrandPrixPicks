import { describe, expect, it } from 'vitest';

import { PIT_LANE_LOADING_PHRASES, pickLoadingPhrase } from './loadingPhrases';

describe('pickLoadingPhrase', () => {
  it('only ever returns a phrase from the list', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(PIT_LANE_LOADING_PHRASES).toContain(pickLoadingPhrase());
    }
  });

  it('reaches more than one phrase', () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => pickLoadingPhrase() as string),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  /**
   * The curtain is one line on a 320px screen. Longer than this wrapped, and
   * the spinner above it jumped as the second line appeared.
   */
  it('keeps every phrase to one short line', () => {
    for (const phrase of PIT_LANE_LOADING_PHRASES) {
      expect(phrase.length).toBeLessThanOrEqual(30);
    }
  });

  /** Sentence case, like every other heading and status in the app. */
  it('writes each phrase in sentence case', () => {
    for (const phrase of PIT_LANE_LOADING_PHRASES) {
      expect(phrase).toBe(phrase[0]!.toUpperCase() + phrase.slice(1));
      expect(phrase).not.toBe(phrase.toUpperCase());
    }
  });
});
