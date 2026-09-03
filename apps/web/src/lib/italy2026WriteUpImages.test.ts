import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

import {
  COLAPINTO_WRITEUP_IMAGE,
  HADJAR_WRITEUP_IMAGE,
  MCLAREN_PAIR_WRITEUP_IMAGE,
  MONZA_HEAT_WRITEUP_IMAGE,
  MONZA_TRACKSIDE_WRITEUP_IMAGE,
  NORRIS_WRITEUP_IMAGE,
  PIRELLI_COMPOUND_WRITEUP_IMAGE,
  SCHUMACHER_TRIBUTE_WRITEUP_IMAGE,
} from './italy2026WriteUpImages';

const PUBLIC_DIR = join(import.meta.dirname, '../../public');

/**
 * Every photo the Monza write-up serves, named.
 *
 * Listed rather than derived from the module's exports so that adding a photo
 * without adding it here is a visible omission, and so a photo that stops being
 * used has to be removed from one place deliberately.
 */
const ALL: [string, WriteUpNewsPhotoProps][] = [
  ['Schumacher', SCHUMACHER_TRIBUTE_WRITEUP_IMAGE],
  ['Hadjar', HADJAR_WRITEUP_IMAGE],
  ['Colapinto', COLAPINTO_WRITEUP_IMAGE],
  ['McLaren pair', MCLAREN_PAIR_WRITEUP_IMAGE],
  ['Monza trackside', MONZA_TRACKSIDE_WRITEUP_IMAGE],
  ['Norris', NORRIS_WRITEUP_IMAGE],
  ['Pirelli compound', PIRELLI_COMPOUND_WRITEUP_IMAGE],
  ['Monza heat', MONZA_HEAT_WRITEUP_IMAGE],
];

/** Every file the record points at, from `src` and from every `srcSet` entry. */
function referencedFiles(image: { src: string; srcSet?: string }): string[] {
  const fromSrcSet = (image.srcSet ?? '')
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter((path): path is string => Boolean(path));
  return [image.src, ...fromSrcSet];
}

describe.each(ALL)('%s write-up photo', (_name, image) => {
  it('carries the attribution its licence requires', () => {
    expect(image.alt.length).toBeGreaterThan(20);
    expect(image.creditName).not.toBe('');
    expect(image.licenseName).toMatch(/^CC BY/);
    expect(image.creditUrl.startsWith('https://commons.wikimedia.org/')).toBe(
      true,
    );
    expect(
      image.licenseUrl.startsWith('https://creativecommons.org/licenses/'),
    ).toBe(true);
    // Every licence used here requires the modification to be indicated, and
    // none of these files is the Commons original: each is a WebP, and all but
    // the trackside photo is cropped to a column shape as well.
    expect(image.modificationNote).toMatch(/resized/);
  });

  it('says where and when, because none of them is this race', () => {
    expect(image.context).toBeTruthy();
  });

  it('points at files that exist', () => {
    for (const file of referencedFiles(image)) {
      expect(existsSync(join(PUBLIC_DIR, file))).toBe(true);
    }
  });
});

describe('SCHUMACHER_TRIBUTE_WRITEUP_IMAGE', () => {
  it('keeps honest Indianapolis attribution', () => {
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.alt).toBe(
      'Michael Schumacher in Ferrari overalls, riding a folding scooter down the Indianapolis pit lane in 2002',
    );
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.context).toBe('Indianapolis, 2002');
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.creditName).toBe('Rick Dikeman');
    expect(SCHUMACHER_TRIBUTE_WRITEUP_IMAGE.licenseName).toBe('CC BY-SA 3.0');
  });
});

/**
 * WebP pixel dimensions, straight out of the RIFF header.
 *
 * Written out rather than pulled from a library because the only thing needed
 * is two numbers per file, and every image package in the tree is a transitive
 * dependency of something else — importing one here would tie this test to a
 * package nothing in `apps/web` actually declares.
 */
function webpSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  const format = buf.toString('ascii', 12, 16);
  if (format === 'VP8 ') {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === 'VP8X') {
    function read24(at: number): number {
      return buf[at] | (buf[at + 1] << 8) | (buf[at + 2] << 16);
    }
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }
  throw new Error(`${file}: not a WebP this reader understands (${format})`);
}

describe('the write-up photo column', () => {
  it('gives every photo one of the column\u2019s two shapes', () => {
    // Width is the constant down the page; height follows the subject. A photo
    // that is neither shape is not a third option, it is a mistake: see the
    // header comment in `italy2026WriteUpImages.ts`.
    for (const [name, image] of ALL) {
      const ratio = image.width / image.height;
      expect(`${name}: ${ratio.toFixed(3)}`).toMatch(/: (0\.800|1\.500)$/);
    }
  });

  it('serves the same picture at every width in a srcSet', () => {
    /*
     * The regression this exists for.
     *
     * The 448 and 896 files were once cropped separately, so they were two
     * different pictures wearing one `srcSet`: the small one framed a driver
     * with room to spare and the large one cut his face in half down the right
     * edge. Which a reader saw came down to their screen width and pixel
     * density, so it looked fine on the machine it was checked on.
     *
     * Identical aspect ratios across a srcSet is what "same crop, two sizes"
     * looks like from outside the file, and it is the part a test can hold.
     * Regenerate all widths from one crop rectangle and this stays true by
     * construction.
     */
    for (const [name, image] of ALL) {
      const declared = image.width / image.height;
      for (const file of referencedFiles(image)) {
        const { width, height } = webpSize(join(PUBLIC_DIR, file));
        expect(`${name} ${file}: ${(width / height).toFixed(3)}`).toBe(
          `${name} ${file}: ${declared.toFixed(3)}`,
        );
      }
    }
  });

  it('declares the dimensions of the file it actually serves', () => {
    // `width`/`height` are what reserves the box before the image lands, so a
    // stale pair here is a layout shift, not a cosmetic mismatch.
    for (const [name, image] of ALL) {
      const actual = webpSize(join(PUBLIC_DIR, image.src));
      expect(`${name}: ${actual.width}x${actual.height}`).toBe(
        `${name}: ${image.width}x${image.height}`,
      );
    }
  });

  it('matches each srcSet width descriptor to the real file', () => {
    for (const [name, image] of ALL) {
      for (const entry of (image.srcSet ?? '').split(',')) {
        const [path, descriptor] = entry.trim().split(/\s+/);
        if (!path || !descriptor) {
          continue;
        }
        const { width } = webpSize(join(PUBLIC_DIR, path));
        expect(`${name} ${path}: ${width}w`).toBe(
          `${name} ${path}: ${descriptor}`,
        );
      }
    }
  });
});
