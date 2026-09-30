import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BAHRAIN_2026_NEWS_IMAGES } from './bahrain2026NewsImages';

// Written into Convex by a migration, served by the web app: a typo in either
// half renders a card whose photo never appears.
const WEB_PUBLIC_DIR = join(import.meta.dirname, '../../../web/public');

describe.each(Object.entries(BAHRAIN_2026_NEWS_IMAGES))('%s', (_key, image) => {
  it('points at files that exist, over https', () => {
    const srcSetFiles = (image.srcSet ?? '')
      .split(',')
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter((path): path is string => Boolean(path));

    for (const file of [image.src, ...srcSetFiles]) {
      expect(existsSync(join(WEB_PUBLIC_DIR, file))).toBe(true);
    }
    expect(image.creditUrl.startsWith('https://')).toBe(true);
    expect(image.licenseUrl.startsWith('https://')).toBe(true);
  });

  it('says where it was taken and that it was modified', () => {
    // None of these is Sepang 2026, and every served file is a resized WebP,
    // which CC BY-SA requires the caption to say.
    expect(image.context).toBeTruthy();
    expect(image.modificationNote).toBeTruthy();
  });
});
