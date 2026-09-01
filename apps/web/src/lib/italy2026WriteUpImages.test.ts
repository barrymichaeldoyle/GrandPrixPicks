import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SCHUMACHER_TRIBUTE_WRITEUP_IMAGE } from './italy2026WriteUpImages';

const PUBLIC_DIR = join(import.meta.dirname, '../../public');

/** Every file the record points at, from `src` and from every `srcSet` entry. */
function referencedFiles(image: { src: string; srcSet?: string }): string[] {
  const fromSrcSet = (image.srcSet ?? '')
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter((path): path is string => Boolean(path));
  return [image.src, ...fromSrcSet];
}

describe('SCHUMACHER_TRIBUTE_WRITEUP_IMAGE', () => {
  it('keeps honest Indianapolis attribution', () => {
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.alt).toBe(
      'Michael Schumacher in Ferrari overalls, riding a folding scooter down the Indianapolis pit lane in 2002',
    );
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.context).toBe('Indianapolis, 2002');
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.creditName).toBe('Rick Dikeman');
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.licenseName).toBe('CC BY-SA 3.0');
    // CC BY-SA requires the modification to be indicated, and the file served
    // is a resized WebP rather than the Commons original.
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.modificationNote).toBe('resized');
  });

  it('points at files that exist, over https', () => {
    for (const file of referencedFiles(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE)) {
      expect(existsSync(join(PUBLIC_DIR, file))).toBe(true);
    }

    expect(
      SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.creditUrl.startsWith('https://'),
    ).toBe(true);
    expect(
      SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.licenseUrl.startsWith('https://'),
    ).toBe(true);
  });
});
