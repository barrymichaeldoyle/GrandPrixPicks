import { describe, expect, it } from 'vitest';

import {
  BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE,
  writeUpImageFieldsMatch,
} from './raceNewsWriteUpImage';

describe('BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE', () => {
  it('keeps honest Austria attribution and hosted asset path', () => {
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.src).toBe(
      '/media/lukas-raich-williams-browning-austria-2026-1920.jpg',
    );
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.alt).toContain(
      'Austrian Grand Prix',
    );
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.creditName).toBe('Lukas Raich');
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.licenseName).toBe(
      'CC BY-SA 4.0',
    );
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.modificationNote).toBe(
      'resized',
    );
  });
});

describe('writeUpImageFieldsMatch', () => {
  it('requires every field, including modificationNote', () => {
    const image = BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE;

    expect(writeUpImageFieldsMatch(image, image)).toBe(true);
    expect(
      writeUpImageFieldsMatch({ ...image, modificationNote: undefined }, image),
    ).toBe(false);
    expect(
      writeUpImageFieldsMatch({ ...image, alt: 'Different alt' }, image),
    ).toBe(false);
  });
});
