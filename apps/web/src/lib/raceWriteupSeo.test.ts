import { describe, expect, it } from 'vitest';

import { racePageWriteupHeadOptions } from './raceWriteupSeo';

describe('racePageWriteupHeadOptions', () => {
  it('canonicalises a race page with a write-up to the write-up, noindexed', () => {
    expect(racePageWriteupHeadOptions('italy-2026')).toEqual({
      canonicalPath: '/f1-2026-italian-grand-prix-predictions',
      noIndex: true,
    });
    expect(racePageWriteupHeadOptions('madrid-2026')).toEqual({
      canonicalPath: '/f1-2026-madrid-grand-prix-predictions',
      noIndex: true,
    });
  });

  it('leaves a race page without a write-up self-canonical and indexable', () => {
    expect(racePageWriteupHeadOptions('miami-2026')).toBeNull();
  });
});
