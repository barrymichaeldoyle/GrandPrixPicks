import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE,
  writeUpImageFieldsMatch,
} from './raceNewsWriteUpImage';

// The record lives here because it is written into Convex by a migration, but
// the files it names are served by the web app. A typo in either half is
// invisible at runtime: the page renders, the photo just never appears.
const WEB_PUBLIC_DIR = join(import.meta.dirname, '../../../web/public');

describe('BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE', () => {
  it('keeps honest Austria attribution', () => {
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.alt).toContain(
      'Austrian Grand Prix',
    );
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.context).toBe('Austria, 2026');
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.creditName).toBe('Lukas Raich');
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.licenseName).toBe(
      'CC BY-SA 4.0',
    );
    // CC BY-SA requires the modification to be indicated, and the file served
    // is a resized WebP rather than the Commons original.
    expect(BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.modificationNote).toBe(
      'resized',
    );
  });

  it('points at files that exist, over https', () => {
    const srcSetFiles = (BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.srcSet ?? '')
      .split(',')
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter((path): path is string => Boolean(path));

    for (const file of [
      BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.src,
      ...srcSetFiles,
    ]) {
      expect(existsSync(join(WEB_PUBLIC_DIR, file))).toBe(true);
    }

    expect(
      BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.creditUrl.startsWith('https://'),
    ).toBe(true);
    expect(
      BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE.licenseUrl.startsWith('https://'),
    ).toBe(true);
  });
});

describe('writeUpImageFieldsMatch', () => {
  it('requires every field', () => {
    const image = BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE;

    expect(writeUpImageFieldsMatch(image, image)).toBe(true);
    expect(writeUpImageFieldsMatch(undefined, image)).toBe(false);

    // Every optional field too: an idempotence guard that skips one reports
    // `unchanged` and never ships the correction.
    expect(
      writeUpImageFieldsMatch({ ...image, modificationNote: undefined }, image),
    ).toBe(false);
    expect(
      writeUpImageFieldsMatch({ ...image, srcSet: undefined }, image),
    ).toBe(false);
    expect(writeUpImageFieldsMatch({ ...image, sizes: 'other' }, image)).toBe(
      false,
    );
    expect(writeUpImageFieldsMatch({ ...image, context: 'Monza' }, image)).toBe(
      false,
    );
    expect(
      writeUpImageFieldsMatch({ ...image, alt: 'Different alt' }, image),
    ).toBe(false);
    expect(writeUpImageFieldsMatch({ ...image, height: 1 }, image)).toBe(false);
  });
});
