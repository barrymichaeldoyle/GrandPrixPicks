import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { WriteUpNewsPhotoProps } from '@/components/WriteUpNewsPhoto';

import {
  ANTONELLI_WIN_WRITEUP_IMAGE,
  BAKU_FERRARI_WRITEUP_IMAGE,
  BAKU_START_WRITEUP_IMAGE,
} from './azerbaijan2026WriteUpImages';

const PUBLIC_DIR = join(import.meta.dirname, '../../public');

const ALL: [string, WriteUpNewsPhotoProps][] = [
  ['Baku start', BAKU_START_WRITEUP_IMAGE],
  ['Baku Ferrari', BAKU_FERRARI_WRITEUP_IMAGE],
  ['Antonelli win', ANTONELLI_WIN_WRITEUP_IMAGE],
];

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
    expect(image.modificationNote).toMatch(/resized/);
  });

  it('says where and when, because none of them is this race', () => {
    expect(image.context).toBeTruthy();
  });

  it('is the 3:2 landscape the margin column uses', () => {
    expect((image.width / image.height).toFixed(3)).toBe('1.500');
  });

  it('points at files that exist', () => {
    for (const file of referencedFiles(image)) {
      expect(existsSync(join(PUBLIC_DIR, file))).toBe(true);
    }
  });
});
